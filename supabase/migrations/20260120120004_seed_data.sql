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

-- ============================================================================
-- 4. PRODUCT_CATALOG SEED DATA
-- Common Polish grocery products with categories, default units, and aliases
-- ============================================================================

insert into product_catalog (name_pl, category_id, default_unit_id, aliases) values
-- Przyprawy (category 8)
('Sól', 8, 1, '{"sól kuchenna", "sól morska", "sól himalajska"}'),
('Pieprz czarny', 8, 1, '{"pieprz", "pieprz mielony"}'),
('Cukier', 8, 1, '{"cukier biały", "cukier kryształ"}'),
('Cukier puder', 8, 1, '{"puder cukrowy"}'),
('Cukier waniliowy', 8, 12, '{}'),
('Proszek do pieczenia', 8, 12, '{"proszek"}'),
('Soda oczyszczona', 8, 10, '{"soda"}'),
('Cynamon', 8, 10, '{"cynamon mielony"}'),
('Papryka słodka', 8, 10, '{"papryka"}'),
('Oregano', 8, 10, '{}'),
('Bazylia', 8, 10, '{"bazylia suszona"}'),
('Tymianek', 8, 10, '{}'),
('Liść laurowy', 8, 11, '{"liście laurowe"}'),
('Ziele angielskie', 8, 11, '{}'),
('Kminek', 8, 10, '{}'),
('Majeranek', 8, 10, '{}'),
('Curry', 8, 10, '{}'),
('Kurkuma', 8, 10, '{}'),

-- Nabiał (category 3)
('Mleko', 3, 6, '{"mleko krowie", "mleko 2%", "mleko 3.2%"}'),
('Masło', 3, 1, '{"masło ekstra", "masło 82%"}'),
('Śmietana 18%', 3, 5, '{"śmietana", "śmietanka"}'),
('Śmietana 30%', 3, 5, '{"śmietana kremówka"}'),
('Jogurt naturalny', 3, 1, '{"jogurt", "jogurt grecki"}'),
('Ser żółty', 3, 1, '{"ser gouda", "ser edamski", "ser tylżycki"}'),
('Ser biały', 3, 1, '{"twaróg", "ser twarogowy"}'),
('Jajka', 3, 11, '{"jajko", "jaja"}'),
('Kefir', 3, 5, '{}'),
('Maślanka', 3, 5, '{}'),

-- Oleje i tłuszcze (category 9)
('Olej rzepakowy', 9, 5, '{"olej", "olej roślinny"}'),
('Oliwa z oliwek', 9, 5, '{"oliwa", "oliwa extra virgin"}'),
('Olej słonecznikowy', 9, 5, '{}'),
('Smalec', 9, 1, '{}'),
('Margaryna', 9, 1, '{}'),

-- Makarony i kasze (category 7)
('Mąka pszenna', 7, 1, '{"mąka", "mąka tortowa", "mąka typ 500"}'),
('Mąka pszenna typ 00', 7, 1, '{"mąka włoska"}'),
('Ryż biały', 7, 1, '{"ryż", "ryż długoziarnisty"}'),
('Ryż basmati', 7, 1, '{}'),
('Kasza gryczana', 7, 1, '{"gryczana", "kasza"}'),
('Kasza jęczmienna', 7, 1, '{"jęczmienna"}'),
('Kasza jaglana', 7, 1, '{"jaglana"}'),
('Makaron spaghetti', 7, 1, '{"spaghetti", "makaron"}'),
('Makaron penne', 7, 1, '{"penne"}'),
('Makaron świderki', 7, 1, '{"świderki", "fusilli"}'),
('Płatki owsiane', 7, 1, '{"owsianka", "płatki"}'),
('Bułka tarta', 7, 1, '{}'),

-- Warzywa (category 1)
('Cebula', 1, 11, '{"cebula żółta", "cebula biała"}'),
('Czosnek', 1, 11, '{"główka czosnku"}'),
('Ziemniaki', 1, 2, '{"kartofle"}'),
('Marchewka', 1, 11, '{"marchew"}'),
('Pietruszka korzeń', 1, 11, '{"pietruszka"}'),
('Seler korzeniowy', 1, 11, '{"seler"}'),
('Por', 1, 11, '{}'),
('Pomidory', 1, 11, '{"pomidor"}'),
('Ogórki', 1, 11, '{"ogórek"}'),
('Papryka czerwona', 1, 11, '{"papryka"}'),
('Kapusta biała', 1, 11, '{"kapusta"}'),
('Brokuły', 1, 11, '{"brokuł"}'),
('Kalafior', 1, 11, '{}'),
('Szpinak', 1, 1, '{}'),
('Sałata', 1, 11, '{"sałata masłowa", "sałata lodowa"}'),
('Natka pietruszki', 1, 13, '{"pietruszka zielona"}'),
('Koperek', 1, 13, '{"koper"}'),
('Szczypiorek', 1, 13, '{}'),

-- Owoce (category 2)
('Jabłka', 2, 11, '{"jabłko"}'),
('Banany', 2, 11, '{"banan"}'),
('Cytryna', 2, 11, '{"cytryny"}'),
('Pomarańcze', 2, 11, '{"pomarańcza"}'),

-- Pieczywo (category 6)
('Chleb pszenny', 6, 11, '{"chleb", "chleb biały"}'),
('Chleb żytni', 6, 11, '{"chleb razowy"}'),
('Bułki', 6, 11, '{"bułka", "kajzerka"}'),

-- Mięso i drób (category 4)
('Pierś z kurczaka', 4, 1, '{"filet z kurczaka", "kurczak"}'),
('Udka z kurczaka', 4, 1, '{"udka kurczaka"}'),
('Mięso mielone wieprzowe', 4, 1, '{"mielone wieprzowe"}'),
('Mięso mielone wołowe', 4, 1, '{"mielone wołowe"}'),
('Mięso mielone mieszane', 4, 1, '{"mięso mielone", "mielone"}'),
('Schab wieprzowy', 4, 1, '{"schab"}'),
('Karkówka', 4, 1, '{}'),
('Boczek', 4, 1, '{"boczek wędzony"}'),
('Kiełbasa', 4, 1, '{"kiełbasa śląska"}'),

-- Konserwy (category 13)
('Pomidory krojone (puszka)', 13, 1, '{"pomidory z puszki", "pomidory pelati"}'),
('Koncentrat pomidorowy', 13, 1, '{"koncentrat", "passata"}'),
('Fasola biała (puszka)', 13, 1, '{"fasola"}'),
('Groszek konserwowy', 13, 1, '{"groszek"}'),
('Kukurydza konserwowa', 13, 1, '{"kukurydza"}'),

-- Napoje (category 10)
('Woda mineralna', 10, 6, '{"woda"}'),
('Sok pomarańczowy', 10, 6, '{"sok"}'),

-- Inne (category 14)
('Drożdże świeże', 14, 1, '{"drożdże"}'),
('Drożdże suszone', 14, 12, '{"drożdże instant"}'),
('Ocet', 14, 5, '{"ocet spirytusowy", "ocet jabłkowy"}'),
('Sos sojowy', 14, 5, '{"sos sojowy ciemny"}'),
('Musztarda', 14, 1, '{"musztarda sarepska"}'),
('Ketchup', 14, 1, '{}'),
('Majonez', 14, 1, '{}'),
('Miód', 14, 1, '{"miód naturalny", "miód wielokwiatowy"}'),
('Bulion drobiowy', 14, 11, '{"kostka rosołowa", "bulion"}'),
('Bulion warzywny', 14, 11, '{"kostka warzywna"}');

-- ============================================================================
-- 5. STAPLE_DEFINITIONS SEED DATA
-- Common pantry staples (14 items) - products assumed always available
-- ============================================================================

insert into staple_definitions (product_id, is_active)
select id, true from product_catalog where name_pl in (
    'Sól',
    'Pieprz czarny',
    'Cukier',
    'Mąka pszenna',
    'Olej rzepakowy',
    'Oliwa z oliwek',
    'Masło',
    'Czosnek',
    'Ocet',
    'Proszek do pieczenia',
    'Ryż biały',
    'Makaron spaghetti',
    'Bulion drobiowy',
    'Musztarda'
);