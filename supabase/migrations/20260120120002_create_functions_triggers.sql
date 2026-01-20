-- Migration: Create Functions and Triggers
-- Purpose: Add database functions and triggers for automatic updates and user management
-- Functions: update_updated_at_column, handle_new_user, increment_ai_usage, update_product_search_vector

-- ============================================================================
-- 1. AUTO-UPDATE updated_at TIMESTAMP
-- ============================================================================

-- Function to automatically update updated_at column on row modification
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

comment on function update_updated_at_column() is 'Automatically sets updated_at to current timestamp on row update';

-- Apply trigger to profiles table
create trigger trigger_profiles_updated_at
    before update on profiles
    for each row
    execute function update_updated_at_column();

-- Apply trigger to inventory_items table
create trigger trigger_inventory_items_updated_at
    before update on inventory_items
    for each row
    execute function update_updated_at_column();

-- Apply trigger to system_config table
create trigger trigger_system_config_updated_at
    before update on system_config
    for each row
    execute function update_updated_at_column();

-- ============================================================================
-- 2. AUTO-UPDATE PRODUCT SEARCH VECTOR
-- ============================================================================

-- Function to update product_catalog search_vector on insert/update
create or replace function update_product_search_vector()
returns trigger as $$
begin
    new.search_vector := to_tsvector('simple', new.name_pl || ' ' || coalesce(array_to_string(new.aliases, ' '), ''));
    return new;
end;
$$ language plpgsql;

comment on function update_product_search_vector() is 'Updates the search_vector column for full-text search on product insert/update';

-- Apply trigger to product_catalog table
create trigger trigger_product_catalog_search_vector
    before insert or update of name_pl, aliases on product_catalog
    for each row
    execute function update_product_search_vector();

-- ============================================================================
-- 3. AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================================

-- Function to create profile when user signs up via Supabase Auth
-- Uses SECURITY DEFINER to bypass RLS when creating the profile
create or replace function handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, allergies, diets, equipment, onboarding_status)
    values (
        new.id,
        '[]'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        'pending'
    );
    return new;
end;
$$ language plpgsql security definer;

comment on function handle_new_user() is 'Creates a profile record when a new user signs up via Supabase Auth';

-- Trigger on auth.users insert
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function handle_new_user();

-- ============================================================================
-- 4. AI USAGE UPSERT FUNCTION
-- ============================================================================

-- Function to increment AI usage counters (atomic upsert)
-- Uses SECURITY DEFINER to allow the function to bypass RLS for system-level operations
-- @param p_user_id: The user's UUID
-- @param p_usage_type: Either 'receipt_scan' or 'substitution'
create or replace function increment_ai_usage(
    p_user_id uuid,
    p_usage_type text  -- 'receipt_scan' or 'substitution'
)
returns void as $$
begin
    if p_usage_type = 'receipt_scan' then
        insert into ai_usage_log (user_id, usage_date, receipt_scan_count, substitution_count)
        values (p_user_id, current_date, 1, 0)
        on conflict (user_id, usage_date)
        do update set receipt_scan_count = ai_usage_log.receipt_scan_count + 1;
    elsif p_usage_type = 'substitution' then
        insert into ai_usage_log (user_id, usage_date, receipt_scan_count, substitution_count)
        values (p_user_id, current_date, 0, 1)
        on conflict (user_id, usage_date)
        do update set substitution_count = ai_usage_log.substitution_count + 1;
    end if;
end;
$$ language plpgsql security definer;

comment on function increment_ai_usage(uuid, text) is 'Atomically increments AI usage counter for a user. Usage type: receipt_scan or substitution';
