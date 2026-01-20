-- Migration: Initial Schema
-- Purpose: Create all database tables for the Mealer application
-- Tables: units, product_categories, product_catalog, staple_definitions, profiles, inventory_items, ai_usage_log, system_config
-- Note: This migration creates the foundational schema. RLS policies are added in a separate migration.

-- ============================================================================
-- 1. UNITS TABLE
-- Lookup table for measurement units (metric and Polish colloquial)
-- ============================================================================
create table units (
    id serial primary key,
    name_pl text not null unique,
    abbreviation text not null unique,
    unit_type text not null check (unit_type in ('weight', 'volume', 'count')),
    base_unit_multiplier decimal(10,6) not null default 1.0
);

comment on table units is 'Lookup table for measurement units (metric and Polish colloquial)';
comment on column units.name_pl is 'Polish name (e.g., "gram", "szklanka")';
comment on column units.abbreviation is 'Short form (e.g., "g", "szt.")';
comment on column units.unit_type is 'Unit category: weight, volume, or count';
comment on column units.base_unit_multiplier is 'Multiplier to convert to base unit (g for weight, ml for volume, 1 for count)';

-- ============================================================================
-- 2. PRODUCT_CATEGORIES TABLE
-- Lookup table for product categorization (Polish grocery categories)
-- ============================================================================
create table product_categories (
    id serial primary key,
    name_pl text not null unique,
    display_order integer not null default 0
);

comment on table product_categories is 'Lookup table for product categorization (Polish grocery categories)';
comment on column product_categories.name_pl is 'Polish category name (e.g., "Nabiał", "Warzywa")';
comment on column product_categories.display_order is 'Sort order for UI display';

-- ============================================================================
-- 3. PRODUCT_CATALOG TABLE
-- Developer-maintained product database for autocomplete
-- ============================================================================
create table product_catalog (
    id serial primary key,
    name_pl text not null unique,
    category_id integer references product_categories(id) on delete set null,
    default_unit_id integer references units(id) on delete set null,
    aliases text[] not null default '{}',
    search_vector tsvector
);

comment on table product_catalog is 'Developer-maintained product database for autocomplete';
comment on column product_catalog.name_pl is 'Polish product name';
comment on column product_catalog.category_id is 'Product category reference';
comment on column product_catalog.default_unit_id is 'Default measurement unit';
comment on column product_catalog.aliases is 'Alternative names for search';
comment on column product_catalog.search_vector is 'Full-text search vector (maintained by trigger)';

-- ============================================================================
-- 4. STAPLE_DEFINITIONS TABLE
-- System-defined list of common pantry staples (~15-20 items)
-- ============================================================================
create table staple_definitions (
    id serial primary key,
    product_id integer not null references product_catalog(id) on delete cascade unique,
    is_active boolean not null default true
);

comment on table staple_definitions is 'System-defined list of common pantry staples (~15-20 items)';
comment on column staple_definitions.product_id is 'Reference to product in catalog';
comment on column staple_definitions.is_active is 'Whether staple is currently active in the system';

-- ============================================================================
-- 5. PROFILES TABLE
-- User profile information extending Supabase auth.users
-- ============================================================================
create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    allergies jsonb not null default '[]'::jsonb,
    diets jsonb not null default '[]'::jsonb,
    equipment jsonb not null default '[]'::jsonb,
    onboarding_status text not null default 'pending' check (onboarding_status in ('pending', 'completed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table profiles is 'User profile information extending Supabase auth.users';
comment on column profiles.id is 'User ID from Supabase Auth (FK to auth.users)';
comment on column profiles.allergies is 'Array of allergy strings (e.g., ["gluten", "lactose"])';
comment on column profiles.diets is 'Array of diet strings (e.g., ["vegetarian", "vegan"])';
comment on column profiles.equipment is 'Array of equipment strings (e.g., ["oven", "blender"])';
comment on column profiles.onboarding_status is 'Onboarding completion status: pending or completed';

-- ============================================================================
-- 6. INVENTORY_ITEMS TABLE
-- User's food inventory (both quantitative items and staples)
-- ============================================================================
create table inventory_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    product_id integer references product_catalog(id) on delete set null,
    custom_name text,
    quantity decimal(10,3),
    unit_id integer references units(id) on delete set null,
    is_staple boolean not null default false,
    is_available boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    -- Either product_id OR custom_name must be provided
    constraint inventory_items_product_or_custom_name 
        check (product_id is not null or custom_name is not null),
    
    -- Staples should not have quantity
    constraint inventory_items_staple_no_quantity 
        check (not is_staple or (quantity is null and unit_id is null))
);

comment on table inventory_items is 'User food inventory (both quantitative items and staples)';
comment on column inventory_items.user_id is 'Owner user ID (FK to auth.users)';
comment on column inventory_items.product_id is 'Reference to catalog product (nullable for custom items)';
comment on column inventory_items.custom_name is 'Custom product name (when product_id is NULL)';
comment on column inventory_items.quantity is 'Amount (nullable for staples)';
comment on column inventory_items.unit_id is 'Measurement unit (nullable for staples)';
comment on column inventory_items.is_staple is 'Whether item is a staple (toggle-based)';
comment on column inventory_items.is_available is 'For staples: Have/Do not Have toggle';

-- ============================================================================
-- 7. AI_USAGE_LOG TABLE
-- Daily aggregate tracking of AI feature usage per user
-- ============================================================================
create table ai_usage_log (
    user_id uuid not null references auth.users(id) on delete cascade,
    usage_date date not null,
    receipt_scan_count integer not null default 0,
    substitution_count integer not null default 0,
    
    primary key (user_id, usage_date)
);

comment on table ai_usage_log is 'Daily aggregate tracking of AI feature usage per user';
comment on column ai_usage_log.user_id is 'User ID (FK to auth.users)';
comment on column ai_usage_log.usage_date is 'Date of usage';
comment on column ai_usage_log.receipt_scan_count is 'Number of receipt scans on this date';
comment on column ai_usage_log.substitution_count is 'Number of AI substitution requests on this date';

-- ============================================================================
-- 8. SYSTEM_CONFIG TABLE
-- Key-value configuration store for runtime settings
-- ============================================================================
create table system_config (
    key text primary key,
    value jsonb not null,
    description text,
    updated_at timestamptz not null default now()
);

comment on table system_config is 'Key-value configuration store for runtime settings';
comment on column system_config.key is 'Configuration key';
comment on column system_config.value is 'Configuration value (JSON)';
comment on column system_config.description is 'Human-readable description';
