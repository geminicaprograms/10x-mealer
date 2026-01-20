# Mealer Database Schema

## 1. Tables

### 1.1 profiles

User profile information extending Supabase auth.users.

| Column            | Type        | Constraints                                                     | Default     | Description                                            |
| ----------------- | ----------- | --------------------------------------------------------------- | ----------- | ------------------------------------------------------ |
| id                | UUID        | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE        | -           | User ID from Supabase Auth                             |
| allergies         | JSONB       | NOT NULL                                                        | '[]'::jsonb | Array of allergy strings (e.g., ["gluten", "lactose"]) |
| diets             | JSONB       | NOT NULL                                                        | '[]'::jsonb | Array of diet strings (e.g., ["vegetarian", "vegan"])  |
| equipment         | JSONB       | NOT NULL                                                        | '[]'::jsonb | Array of equipment strings (e.g., ["oven", "blender"]) |
| onboarding_status | TEXT        | NOT NULL, CHECK (onboarding_status IN ('pending', 'completed')) | 'pending'   | Onboarding completion status                           |
| created_at        | TIMESTAMPTZ | NOT NULL                                                        | NOW()       | Record creation timestamp                              |
| updated_at        | TIMESTAMPTZ | NOT NULL                                                        | NOW()       | Record update timestamp                                |

### 1.2 units

Lookup table for measurement units (metric and Polish colloquial).

| Column               | Type          | Constraints                                                  | Default | Description                                                                   |
| -------------------- | ------------- | ------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------- |
| id                   | SERIAL        | PRIMARY KEY                                                  | -       | Auto-incrementing ID                                                          |
| name_pl              | TEXT          | NOT NULL, UNIQUE                                             | -       | Polish name (e.g., "gram", "szklanka")                                        |
| abbreviation         | TEXT          | NOT NULL, UNIQUE                                             | -       | Short form (e.g., "g", "szt.")                                                |
| unit_type            | TEXT          | NOT NULL, CHECK (unit_type IN ('weight', 'volume', 'count')) | -       | Unit category                                                                 |
| base_unit_multiplier | DECIMAL(10,6) | NOT NULL                                                     | 1.0     | Multiplier to convert to base unit (g for weight, ml for volume, 1 for count) |

### 1.3 product_categories

Lookup table for product categorization (Polish grocery categories).

| Column        | Type    | Constraints      | Default | Description                                      |
| ------------- | ------- | ---------------- | ------- | ------------------------------------------------ |
| id            | SERIAL  | PRIMARY KEY      | -       | Auto-incrementing ID                             |
| name_pl       | TEXT    | NOT NULL, UNIQUE | -       | Polish category name (e.g., "Nabiał", "Warzywa") |
| display_order | INTEGER | NOT NULL         | 0       | Sort order for UI display                        |

### 1.4 product_catalog

Developer-maintained product database for autocomplete.

| Column          | Type     | Constraints                                                                                             | Default | Description                  |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------- | ------- | ---------------------------- |
| id              | SERIAL   | PRIMARY KEY                                                                                             | -       | Auto-incrementing ID         |
| name_pl         | TEXT     | NOT NULL, UNIQUE                                                                                        | -       | Polish product name          |
| category_id     | INTEGER  | REFERENCES product_categories(id) ON DELETE SET NULL                                                    | NULL    | Product category             |
| default_unit_id | INTEGER  | REFERENCES units(id) ON DELETE SET NULL                                                                 | NULL    | Default measurement unit     |
| aliases         | TEXT[]   | NOT NULL                                                                                                | '{}'    | Alternative names for search |
| search_vector   | TSVECTOR | GENERATED ALWAYS AS (to_tsvector('polish', name_pl \|\| ' ' \|\| array_to_string(aliases, ' '))) STORED | -       | Full-text search vector      |

### 1.5 staple_definitions

System-defined list of common pantry staples (~15-20 items).

| Column     | Type    | Constraints                                                        | Default | Description                        |
| ---------- | ------- | ------------------------------------------------------------------ | ------- | ---------------------------------- |
| id         | SERIAL  | PRIMARY KEY                                                        | -       | Auto-incrementing ID               |
| product_id | INTEGER | NOT NULL, REFERENCES product_catalog(id) ON DELETE CASCADE, UNIQUE | -       | Reference to product               |
| is_active  | BOOLEAN | NOT NULL                                                           | TRUE    | Whether staple is currently active |

### 1.6 inventory_items

User's food inventory (both quantitative items and staples).

| Column       | Type          | Constraints                                           | Default           | Description                                              |
| ------------ | ------------- | ----------------------------------------------------- | ----------------- | -------------------------------------------------------- |
| id           | UUID          | PRIMARY KEY                                           | gen_random_uuid() | Unique item ID                                           |
| user_id      | UUID          | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | -                 | Owner user ID                                            |
| product_id   | INTEGER       | REFERENCES product_catalog(id) ON DELETE SET NULL     | NULL              | Reference to catalog product (nullable for custom items) |
| custom_name  | TEXT          |                                                       | NULL              | Custom product name (when product_id is NULL)            |
| quantity     | DECIMAL(10,3) |                                                       | NULL              | Amount (nullable for staples)                            |
| unit_id      | INTEGER       | REFERENCES units(id) ON DELETE SET NULL               | NULL              | Measurement unit (nullable for staples)                  |
| is_staple    | BOOLEAN       | NOT NULL                                              | FALSE             | Whether item is a staple (toggle-based)                  |
| is_available | BOOLEAN       | NOT NULL                                              | TRUE              | For staples: Have/Don't Have toggle                      |
| created_at   | TIMESTAMPTZ   | NOT NULL                                              | NOW()             | Record creation timestamp                                |
| updated_at   | TIMESTAMPTZ   | NOT NULL                                              | NOW()             | Record update timestamp                                  |

**Check Constraint:** Either `product_id` OR `custom_name` must be provided:

```sql
CHECK (product_id IS NOT NULL OR custom_name IS NOT NULL)
```

**Check Constraint:** Staples should not have quantity:

```sql
CHECK (NOT is_staple OR (quantity IS NULL AND unit_id IS NULL))
```

### 1.7 ai_usage_log

Daily aggregate tracking of AI feature usage per user.

| Column             | Type    | Constraints                                           | Default | Description                                     |
| ------------------ | ------- | ----------------------------------------------------- | ------- | ----------------------------------------------- |
| user_id            | UUID    | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | -       | User ID                                         |
| usage_date         | DATE    | NOT NULL                                              | -       | Date of usage                                   |
| receipt_scan_count | INTEGER | NOT NULL                                              | 0       | Number of receipt scans on this date            |
| substitution_count | INTEGER | NOT NULL                                              | 0       | Number of AI substitution requests on this date |

**Primary Key:** Composite (user_id, usage_date)

### 1.8 system_config

Key-value configuration store for runtime settings.

| Column      | Type        | Constraints | Default | Description                |
| ----------- | ----------- | ----------- | ------- | -------------------------- |
| key         | TEXT        | PRIMARY KEY | -       | Configuration key          |
| value       | JSONB       | NOT NULL    | -       | Configuration value        |
| description | TEXT        |             | NULL    | Human-readable description |
| updated_at  | TIMESTAMPTZ | NOT NULL    | NOW()   | Last update timestamp      |

---

## 2. Relationships

### Entity Relationship Diagram

```
┌─────────────────┐
│   auth.users    │ (Supabase managed)
│   (id: UUID)    │
└────────┬────────┘
         │
         │ 1:1 (auto-created by trigger)
         ▼
┌─────────────────┐
│    profiles     │
│   (id: UUID)    │
└─────────────────┘
         │
         │ 1:many
         ▼
┌─────────────────┐          ┌─────────────────┐
│ inventory_items │─────────>│ product_catalog │
│   (id: UUID)    │ many:1   │   (id: SERIAL)  │
└─────────────────┘          └────────┬────────┘
         │                            │
         │ many:1                     │ many:1
         ▼                            ▼
┌─────────────────┐          ┌───────────────────┐
│      units      │          │ product_categories│
│   (id: SERIAL)  │          │    (id: SERIAL)   │
└─────────────────┘          └───────────────────┘
         ▲
         │ many:1
         │
┌─────────────────┐
│ product_catalog │
└─────────────────┘


┌─────────────────┐          ┌─────────────────┐
│   auth.users    │ 1:many   │  ai_usage_log   │
│                 │─────────>│ (user_id, date) │
└─────────────────┘          └─────────────────┘


┌─────────────────┐          ┌───────────────-──┐
│ product_catalog │ 1:1      │staple_definitions│
│                 │<─────────│   (id: SERIAL)   │
└─────────────────┘          └───────────────- ──┘
```

### Relationship Summary

| Parent Table       | Child Table        | Cardinality | Description                                         |
| ------------------ | ------------------ | ----------- | --------------------------------------------------- |
| auth.users         | profiles           | 1:1         | Each user has exactly one profile                   |
| auth.users         | inventory_items    | 1:many      | Each user can have many inventory items             |
| auth.users         | ai_usage_log       | 1:many      | Each user has one entry per day                     |
| product_catalog    | inventory_items    | 1:many      | Multiple inventory items can reference same product |
| product_catalog    | staple_definitions | 1:1         | Each staple references a unique product             |
| product_categories | product_catalog    | 1:many      | Each category contains many products                |
| units              | product_catalog    | 1:many      | Each unit can be default for many products          |
| units              | inventory_items    | 1:many      | Each unit can be used by many items                 |

---

## 3. Indexes

### Primary Key Indexes (automatic)

- `profiles_pkey` on profiles(id)
- `units_pkey` on units(id)
- `product_categories_pkey` on product_categories(id)
- `product_catalog_pkey` on product_catalog(id)
- `staple_definitions_pkey` on staple_definitions(id)
- `inventory_items_pkey` on inventory_items(id)
- `ai_usage_log_pkey` on ai_usage_log(user_id, usage_date)
- `system_config_pkey` on system_config(key)

### Unique Indexes (automatic from constraints)

- `units_name_pl_key` on units(name_pl)
- `units_abbreviation_key` on units(abbreviation)
- `product_categories_name_pl_key` on product_categories(name_pl)
- `product_catalog_name_pl_key` on product_catalog(name_pl)
- `staple_definitions_product_id_key` on staple_definitions(product_id)

### Performance Indexes

```sql
-- User inventory lookup (most common query)
CREATE INDEX idx_inventory_user_id
ON inventory_items(user_id);

-- User inventory with product (for joins)
CREATE INDEX idx_inventory_user_product
ON inventory_items(user_id, product_id);

-- Staples filter for inventory display
CREATE INDEX idx_inventory_user_staple
ON inventory_items(user_id, is_staple);

-- Product full-text search (GIN for efficient text search)
CREATE INDEX idx_product_search
ON product_catalog USING GIN(search_vector);

-- Product category filter
CREATE INDEX idx_product_category
ON product_catalog(category_id);

-- AI usage lookup by user and date
CREATE INDEX idx_ai_usage_user_date
ON ai_usage_log(user_id, usage_date DESC);
```

---

## 4. Database Functions and Triggers

### 4.1 Auto-update updated_at Timestamp

```sql
-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to inventory_items
CREATE TRIGGER trigger_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to system_config
CREATE TRIGGER trigger_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4.2 Auto-create Profile on User Signup

```sql
-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, allergies, diets, equipment, onboarding_status)
    VALUES (
        NEW.id,
        '[]'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        'pending'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
```

### 4.3 AI Usage Upsert Function

```sql
-- Function to increment AI usage counters (atomic upsert)
CREATE OR REPLACE FUNCTION increment_ai_usage(
    p_user_id UUID,
    p_usage_type TEXT  -- 'receipt_scan' or 'substitution'
)
RETURNS void AS $$
BEGIN
    IF p_usage_type = 'receipt_scan' THEN
        INSERT INTO ai_usage_log (user_id, usage_date, receipt_scan_count, substitution_count)
        VALUES (p_user_id, CURRENT_DATE, 1, 0)
        ON CONFLICT (user_id, usage_date)
        DO UPDATE SET receipt_scan_count = ai_usage_log.receipt_scan_count + 1;
    ELSIF p_usage_type = 'substitution' THEN
        INSERT INTO ai_usage_log (user_id, usage_date, receipt_scan_count, substitution_count)
        VALUES (p_user_id, CURRENT_DATE, 0, 1)
        ON CONFLICT (user_id, usage_date)
        DO UPDATE SET substitution_count = ai_usage_log.substitution_count + 1;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Row Level Security (RLS) Policies

### 5.1 Enable RLS on All Tables

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE staple_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
```

### 5.2 profiles Policies

```sql
-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can only update their own profile
-- INSERT is handled by trigger, so no INSERT policy needed
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- DELETE cascades from auth.users, no direct delete policy needed
```

### 5.3 inventory_items Policies

```sql
-- Users can view their own inventory items
CREATE POLICY "Users can view own inventory"
ON inventory_items FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own inventory items
CREATE POLICY "Users can insert own inventory"
ON inventory_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own inventory items
CREATE POLICY "Users can update own inventory"
ON inventory_items FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own inventory items
CREATE POLICY "Users can delete own inventory"
ON inventory_items FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

### 5.4 ai_usage_log Policies

```sql
-- Users can view their own AI usage
CREATE POLICY "Users can view own ai usage"
ON ai_usage_log FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own AI usage (for direct inserts)
CREATE POLICY "Users can insert own ai usage"
ON ai_usage_log FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own AI usage (for counter increments)
CREATE POLICY "Users can update own ai usage"
ON ai_usage_log FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 5.5 Lookup Tables Policies (Read-only for authenticated users)

```sql
-- units: All authenticated users can read
CREATE POLICY "Authenticated users can read units"
ON units FOR SELECT
TO authenticated
USING (true);

-- product_categories: All authenticated users can read
CREATE POLICY "Authenticated users can read categories"
ON product_categories FOR SELECT
TO authenticated
USING (true);

-- product_catalog: All authenticated users can read
CREATE POLICY "Authenticated users can read products"
ON product_catalog FOR SELECT
TO authenticated
USING (true);

-- staple_definitions: All authenticated users can read
CREATE POLICY "Authenticated users can read staples"
ON staple_definitions FOR SELECT
TO authenticated
USING (true);

-- system_config: All authenticated users can read
CREATE POLICY "Authenticated users can read config"
ON system_config FOR SELECT
TO authenticated
USING (true);
```

---

## 6. Seed Data

### 6.1 Units

```sql
INSERT INTO units (name_pl, abbreviation, unit_type, base_unit_multiplier) VALUES
-- Weight (base: gram)
('gram', 'g', 'weight', 1),
('kilogram', 'kg', 'weight', 1000),
('dekagram', 'dag', 'weight', 10),
('miligram', 'mg', 'weight', 0.001),
-- Volume (base: milliliter)
('mililitr', 'ml', 'volume', 1),
('litr', 'l', 'volume', 1000),
('decylitr', 'dl', 'volume', 100),
-- Polish colloquial units
('szklanka', 'szkl.', 'volume', 250),  -- ~250ml
('łyżka', 'łyż.', 'volume', 15),       -- ~15ml
('łyżeczka', 'łyżecz.', 'volume', 5),  -- ~5ml
-- Count
('sztuka', 'szt.', 'count', 1),
('opakowanie', 'opak.', 'count', 1),
('pęczek', 'pęcz.', 'count', 1);
```

### 6.2 Product Categories

```sql
INSERT INTO product_categories (name_pl, display_order) VALUES
('Warzywa', 1),
('Owoce', 2),
('Nabiał', 3),
('Mięso i drób', 4),
('Ryby i owoce morza', 5),
('Pieczywo', 6),
('Makarony i kasze', 7),
('Przyprawy', 8),
('Oleje i tłuszcze', 9),
('Napoje', 10),
('Słodycze i przekąski', 11),
('Mrożonki', 12),
('Konserwy', 13),
('Inne', 99);
```

### 6.3 System Configuration

```sql
INSERT INTO system_config (key, value, description) VALUES
('rate_limits', '{
    "receipt_scans_per_day": 5,
    "substitutions_per_day": 10
}'::jsonb, 'Daily AI usage limits per user'),
('supported_allergies', '["gluten", "laktoza", "orzechy", "jaja", "soja", "ryby", "skorupiaki", "seler", "gorczyca", "sezam", "siarczyny", "łubin", "mięczaki"]'::jsonb, 'Supported allergy types for user profiles'),
('supported_diets', '["wegetariańska", "wegańska", "bezglutenowa", "bezlaktozowa", "keto", "paleo"]'::jsonb, 'Supported diet types for user profiles'),
('supported_equipment', '["piekarnik", "kuchenka mikrofalowa", "blender", "mikser", "robot kuchenny", "grill", "frytkownica", "wolnowar", "szybkowar", "parowar", "toster", "opiekacz"]'::jsonb, 'Supported kitchen equipment for user profiles');
```

---

## 7. Additional Notes

### 7.1 Design Decisions

1. **JSONB for User Preferences**: Using JSONB arrays for allergies, diets, and equipment provides flexibility without the overhead of junction tables. Validation is handled at the application level against values stored in `system_config`.

2. **Unified Inventory Table**: A single `inventory_items` table with an `is_staple` flag simplifies queries and avoids data duplication. Staples use `is_available` toggle while regular items track quantities.

3. **Generated TSVECTOR Column**: The `search_vector` column in `product_catalog` is automatically maintained by PostgreSQL, enabling efficient full-text search with Polish language stemming.

4. **Composite Primary Key for AI Usage**: Using `(user_id, usage_date)` as the primary key for `ai_usage_log` ensures atomic upserts and efficient daily limit checking.

5. **Cascade Deletion**: All user-related foreign keys use `ON DELETE CASCADE` to ensure complete data removal when a user account is deleted (GDPR compliance).

6. **Security Definer Functions**: Functions like `handle_new_user()` and `increment_ai_usage()` use `SECURITY DEFINER` to bypass RLS when needed for system operations.

### 7.2 Performance Considerations

1. **Index Strategy**: Indexes are designed around the most common query patterns:
   - User inventory lookups (by user_id)
   - Product autocomplete (GIN index on search_vector)
   - AI usage checks (by user_id and date)

2. **Denormalization**: The `custom_name` field in `inventory_items` allows users to add items not in the catalog without creating a full product entry, reducing lookup complexity.

3. **Lookup Table Caching**: Units, categories, and system config rarely change and can be cached at the application level.

### 7.3 Migration Order

When implementing migrations, follow this order to respect foreign key dependencies:

1. Create extension (if needed): `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
2. Create `units` table
3. Create `product_categories` table
4. Create `product_catalog` table (depends on units, categories)
5. Create `staple_definitions` table (depends on product_catalog)
6. Create `profiles` table
7. Create `inventory_items` table (depends on units, product_catalog)
8. Create `ai_usage_log` table
9. Create `system_config` table
10. Create indexes
11. Create functions and triggers
12. Enable RLS and create policies
13. Insert seed data (units, categories, config, products, staples)

### 7.4 TypeScript Types (for Supabase client)

The schema will generate TypeScript types via Supabase CLI. Key type considerations:

- `profiles.id` is UUID (string in TypeScript)
- JSONB columns map to `Json` type, but should be typed as `string[]` in application code
- `DECIMAL` columns map to `number` in TypeScript
- Nullable columns map to `T | null` types

### 7.5 Future Considerations

1. **Multi-language Support**: If expanding beyond Polish, consider adding `name_en` columns to lookup tables and parameterizing the TSVECTOR language.

2. **Inventory History**: If undo/history features are needed later, consider adding an `inventory_transactions` table.

3. **Product Contributions**: If users should contribute products, add a review/approval workflow and user attribution.

4. **Advanced Rate Limiting**: If more granular limits are needed, the `ai_usage_log` structure can be extended with additional counter columns.
