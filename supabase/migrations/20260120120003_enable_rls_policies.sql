-- Migration: Enable RLS and Create Policies
-- Purpose: Enable Row Level Security on all tables and create access policies
-- Security model: 
--   - User tables (profiles, inventory_items, ai_usage_log): Users can only access their own data
--   - Lookup tables (units, product_categories, product_catalog, staple_definitions, system_config): Read-only for authenticated users

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

alter table profiles enable row level security;
alter table inventory_items enable row level security;
alter table ai_usage_log enable row level security;
alter table units enable row level security;
alter table product_categories enable row level security;
alter table product_catalog enable row level security;
alter table staple_definitions enable row level security;
alter table system_config enable row level security;

-- ============================================================================
-- PROFILES POLICIES
-- Users can only view and update their own profile
-- INSERT is handled by trigger (handle_new_user), so no INSERT policy needed
-- DELETE cascades from auth.users, so no DELETE policy needed
-- ============================================================================

-- Authenticated users can view their own profile
create policy "profiles_select_own"
on profiles for select
to authenticated
using (auth.uid() = id);

-- Authenticated users can update their own profile
create policy "profiles_update_own"
on profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- ============================================================================
-- INVENTORY_ITEMS POLICIES
-- Full CRUD for authenticated users on their own inventory items
-- ============================================================================

-- Authenticated users can view their own inventory items
create policy "inventory_items_select_own"
on inventory_items for select
to authenticated
using (auth.uid() = user_id);

-- Authenticated users can insert their own inventory items
create policy "inventory_items_insert_own"
on inventory_items for insert
to authenticated
with check (auth.uid() = user_id);

-- Authenticated users can update their own inventory items
create policy "inventory_items_update_own"
on inventory_items for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Authenticated users can delete their own inventory items
create policy "inventory_items_delete_own"
on inventory_items for delete
to authenticated
using (auth.uid() = user_id);

-- ============================================================================
-- AI_USAGE_LOG POLICIES
-- Users can view, insert, and update their own AI usage records
-- No delete policy - usage records should be retained for auditing
-- ============================================================================

-- Authenticated users can view their own AI usage
create policy "ai_usage_log_select_own"
on ai_usage_log for select
to authenticated
using (auth.uid() = user_id);

-- Authenticated users can insert their own AI usage (for direct inserts)
create policy "ai_usage_log_insert_own"
on ai_usage_log for insert
to authenticated
with check (auth.uid() = user_id);

-- Authenticated users can update their own AI usage (for counter increments)
create policy "ai_usage_log_update_own"
on ai_usage_log for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================================
-- LOOKUP TABLES POLICIES
-- Read-only access for authenticated users
-- These tables are managed by developers/admins, not end users
-- ============================================================================

-- UNITS: Authenticated users can read all units
create policy "units_select_authenticated"
on units for select
to authenticated
using (true);

-- PRODUCT_CATEGORIES: Authenticated users can read all categories
create policy "product_categories_select_authenticated"
on product_categories for select
to authenticated
using (true);

-- PRODUCT_CATALOG: Authenticated users can read all products
create policy "product_catalog_select_authenticated"
on product_catalog for select
to authenticated
using (true);

-- STAPLE_DEFINITIONS: Authenticated users can read all staple definitions
create policy "staple_definitions_select_authenticated"
on staple_definitions for select
to authenticated
using (true);

-- SYSTEM_CONFIG: Authenticated users can read all configuration
create policy "system_config_select_authenticated"
on system_config for select
to authenticated
using (true);
