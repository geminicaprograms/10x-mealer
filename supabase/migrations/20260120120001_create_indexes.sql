-- Migration: Create Performance Indexes
-- Purpose: Add indexes for common query patterns and performance optimization
-- Affected tables: inventory_items, product_catalog, ai_usage_log

-- ============================================================================
-- INVENTORY_ITEMS INDEXES
-- ============================================================================

-- User inventory lookup (most common query)
-- Used when fetching all inventory items for a user
create index idx_inventory_user_id 
on inventory_items(user_id);

-- User inventory with product (for joins)
-- Used when joining inventory with product_catalog
create index idx_inventory_user_product 
on inventory_items(user_id, product_id);

-- Staples filter for inventory display
-- Used when filtering inventory to show only staples or non-staples
create index idx_inventory_user_staple 
on inventory_items(user_id, is_staple);

-- ============================================================================
-- PRODUCT_CATALOG INDEXES
-- ============================================================================

-- Product full-text search (GIN for efficient text search)
-- Used for product autocomplete and search functionality
create index idx_product_search 
on product_catalog using gin(search_vector);

-- Product category filter
-- Used when displaying products by category
create index idx_product_category 
on product_catalog(category_id);

-- ============================================================================
-- AI_USAGE_LOG INDEXES
-- ============================================================================

-- AI usage lookup by user and date
-- Used for checking daily rate limits and usage history
create index idx_ai_usage_user_date 
on ai_usage_log(user_id, usage_date desc);
