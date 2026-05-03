-- ============================================================================
-- ZUMA · Schema real de Supabase (3 mayo 2026)
-- ============================================================================
-- Generado a partir del dump real de information_schema.
-- Las tablas loyalty_levels y loyalty_programs NO existen.
-- Los niveles se almacenan en businesses.loyalty_levels (JSONB).
-- ============================================================================

-- ============================================================================
-- TABLAS
-- ============================================================================

-- 1. profiles
--    id (uuid PK), name (text), username (text), email (text),
--    phone (text), user_id (uuid), created_at (timestamp)

-- 2. businesses
--    id (uuid PK, gen_random_uuid), owner_id (uuid FK → auth.users),
--    name (text), category (text), description (text?),
--    address (text?), phone (text?),
--    loyalty_levels (jsonb) ← DEFAULT con Bronze/Silver/Gold
--    hours (jsonb), status (text, DEFAULT 'pending', CHECK 'pending'|'active'|'suspended'),
--    created_at, updated_at (timestamptz)

-- 3. loyalty_cards  ← ⚠️ NO tiene current_level_id
--    id (uuid PK), user_id (uuid FK → auth.users),
--    business_id (uuid FK → businesses),
--    card_number (text UNIQUE), current_points (int DEFAULT 0, CHECK >=0),
--    total_points_earned (int DEFAULT 0),
--    total_visits (int DEFAULT 0, CHECK >=0),
--    current_level (text, DEFAULT 'Bronze'),  ← TEXTO, no UUID
--    is_active (bool DEFAULT true),
--    last_visit (timestamptz?),
--    issued_at, updated_at (timestamptz)
--    UNIQUE(user_id, business_id)

-- 4. business_cards  ← Tabla separada (credenciales de negocio?)
--    id (uuid), user_id (uuid), business_id (uuid),
--    card_number (text), current_points (int), total_visits (int),
--    is_active (bool), user_email (varchar 255), user_name (text),
--    issued_at, updated_at (timestamptz)

-- 5. products
--    id (uuid PK), business_id (uuid FK → businesses),
--    name (text), description (text?), price (numeric, CHECK >=0),
--    points (int, CHECK >=0), category (text?), image_url (text?),
--    is_available (bool DEFAULT true), is_featured (bool DEFAULT false),
--    created_at, updated_at (timestamptz)

-- 6. purchases
--    id (uuid PK), loyalty_card_id (uuid FK → loyalty_cards),
--    business_id (uuid FK → businesses),
--    total_amount (numeric, CHECK >=0), total_points (int, CHECK >=0),
--    status (text DEFAULT 'completed', CHECK 'completed'|'cancelled'|'refunded'),
--    payment_method (text?), notes (text?),
--    created_by (uuid FK → auth.users),
--    created_at (timestamptz)

-- 7. purchase_items
--    id (uuid PK), purchase_id (uuid FK → purchases),
--    product_id (uuid FK → products),
--    quantity (int, CHECK >=1), unit_price (numeric, CHECK >=0),
--    points_per_unit (int, CHECK >=0), total_points (int, CHECK >=0),
--    created_at (timestamptz)

-- 8. point_transactions
--    id (uuid PK), loyalty_card_id (uuid FK → loyalty_cards),
--    type (text, CHECK 'earned'|'redeemed'|'adjusted'),
--    points (int), description (text),
--    reference_id (uuid?), reference_type (text?),
--    created_by (uuid FK → auth.users),
--    created_at (timestamptz)

-- 9. rewards
--    id (uuid PK), business_id (uuid FK → businesses),
--    name (text), description (text?), points_cost (int),
--    image_url (text?), category (text?),
--    is_available (bool), is_limited (bool),
--    quantity_available (int?), valid_from (timestamptz?),
--    valid_until (timestamptz?), min_level (text?),
--    created_at, updated_at (timestamptz)

-- 10. reward_redemptions
--     id (uuid PK), loyalty_card_id (uuid FK → loyalty_cards),
--     reward_id (uuid FK → rewards),
--     points_used (int, CHECK >=0), status (text DEFAULT 'pending',
--       CHECK 'pending'|'claimed'|'expired'),
--     redemption_code (text UNIQUE),
--     claimed_at (timestamptz?), expires_at (timestamptz?),
--     notes (text?), created_at (timestamptz)

-- 11. notifications
--     id (uuid PK), user_id (uuid FK → auth.users),
--     business_id (uuid FK → businesses),
--     type (text, CHECK 'level_up'|'points_earned'|'reward_unlocked'|
--       'promotion'|'general'),
--     title (text), message (text),
--     metadata (jsonb, DEFAULT '{}'),
--     is_read (bool DEFAULT false),
--     created_at (timestamptz)


-- ============================================================================
-- TRIGGERS (los que ya existen y funcionan)
-- ============================================================================

-- ✅ trigger_check_level_up  ON loyalty_cards AFTER UPDATE
--    → check_level_up() — lee businesses.loyalty_levels JSONB,
--      actualiza current_level, inserta notificación level_up

-- ✅ trigger_apply_multiplier ON purchases BEFORE INSERT
--    → apply_points_multiplier() — lee businesses.loyalty_levels JSONB,
--      multiplica NEW.total_points por el multiplier del nivel

-- ✅ trg_card_created         ON loyalty_cards AFTER INSERT
-- ✅ trg_points_earned        ON point_transactions AFTER INSERT
-- ✅ trg_reward_redeemed      ON reward_redemptions AFTER INSERT
-- ✅ trg_redemption_resolved  ON reward_redemptions AFTER UPDATE
-- ✅ trg_business_approved    ON businesses AFTER UPDATE

-- ✅ update_*_updated_at      (8 triggers para auto-timestamp)


-- ============================================================================
-- NOTA: NO existe la tabla loyalty_levels ni loyalty_programs.
--       NO existe la columna loyalty_cards.current_level_id.
--       Todo se maneja con businesses.loyalty_levels (JSONB).
-- ============================================================================
