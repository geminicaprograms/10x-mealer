-- Migration: Disable RLS Policies (Development Only)
-- Purpose: Disable Row Level Security for local development and testing
-- WARNING: This migration should NOT be applied to production environments!
--
-- To enable RLS for production, either:
-- 1. Delete this migration file before deploying
-- 2. Create a new migration that re-enables RLS

-- ============================================================================
-- DROP ALL POLICIES
-- ============================================================================

-- Profiles policies
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;

-- Inventory items policies
drop policy if exists "inventory_items_select_own" on inventory_items;
drop policy if exists "inventory_items_insert_own" on inventory_items;
drop policy if exists "inventory_items_update_own" on inventory_items;
drop policy if exists "inventory_items_delete_own" on inventory_items;

-- AI usage log policies
drop policy if exists "ai_usage_log_select_own" on ai_usage_log;
drop policy if exists "ai_usage_log_insert_own" on ai_usage_log;
drop policy if exists "ai_usage_log_update_own" on ai_usage_log;

-- Lookup tables policies
drop policy if exists "units_select_authenticated" on units;
drop policy if exists "product_categories_select_authenticated" on product_categories;
drop policy if exists "product_catalog_select_authenticated" on product_catalog;
drop policy if exists "staple_definitions_select_authenticated" on staple_definitions;
drop policy if exists "system_config_select_authenticated" on system_config;

-- ============================================================================
-- DISABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

alter table profiles disable row level security;
alter table inventory_items disable row level security;
alter table ai_usage_log disable row level security;
alter table units disable row level security;
alter table product_categories disable row level security;
alter table product_catalog disable row level security;
alter table staple_definitions disable row level security;
alter table system_config disable row level security;
