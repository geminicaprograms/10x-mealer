-- Migration: Seed Data
-- Purpose: Insert initial data for lookup tables and system configuration
-- Tables: units, product_categories, system_config

-- ============================================================================
-- 1. UNITS SEED DATA
-- Measurement units: metric (weight, volume) and Polish colloquial
-- ============================================================================

insert into units (name_pl, abbreviation, unit_type, base_unit_multiplier) values
-- Weight (base unit: gram)
('gram', 'g', 'weight', 1),
('kilogram', 'kg', 'weight', 1000),
('dekagram', 'dag', 'weight', 10),
('miligram', 'mg', 'weight', 0.001),
-- Volume (base unit: milliliter)
('mililitr', 'ml', 'volume', 1),
('litr', 'l', 'volume', 1000),
('decylitr', 'dl', 'volume', 100),
-- Polish colloquial volume units
('szklanka', 'szkl.', 'volume', 250),    -- ~250ml (standard Polish glass)
('łyżka', 'łyż.', 'volume', 15),         -- ~15ml (tablespoon)
('łyżeczka', 'łyżecz.', 'volume', 5),    -- ~5ml (teaspoon)
-- Count units
('sztuka', 'szt.', 'count', 1),
('opakowanie', 'opak.', 'count', 1),
('pęczek', 'pęcz.', 'count', 1);

-- ============================================================================
-- 2. PRODUCT_CATEGORIES SEED DATA
-- Polish grocery categories with display order
-- ============================================================================

insert into product_categories (name_pl, display_order) values
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

-- ============================================================================
-- 3. SYSTEM_CONFIG SEED DATA
-- Runtime configuration for the application
-- ============================================================================

insert into system_config (key, value, description) values
(
    'rate_limits',
    '{
        "receipt_scans_per_day": 5,
        "substitutions_per_day": 10
    }'::jsonb,
    'Daily AI usage limits per user'
),
(
    'supported_allergies',
    '["gluten", "laktoza", "orzechy", "jaja", "soja", "ryby", "skorupiaki", "seler", "gorczyca", "sezam", "siarczyny", "łubin", "mięczaki"]'::jsonb,
    'Supported allergy types for user profiles (Polish names)'
),
(
    'supported_diets',
    '["wegetariańska", "wegańska", "bezglutenowa", "bezlaktozowa", "keto", "paleo"]'::jsonb,
    'Supported diet types for user profiles (Polish names)'
),
(
    'supported_equipment',
    '["piekarnik", "kuchenka mikrofalowa", "blender", "mikser", "robot kuchenny", "grill", "frytkownica", "wolnowar", "szybkowar", "parowar", "toster", "opiekacz"]'::jsonb,
    'Supported kitchen equipment for user profiles (Polish names)'
);
