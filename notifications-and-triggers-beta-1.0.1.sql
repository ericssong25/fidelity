-- ============================================================================
-- ZUMA · Beta 1.0.1 — Notificaciones y triggers
-- ============================================================================
-- Ejecutar en el SQL Editor de Supabase, en orden.
-- PRIMERO: Correcciones de schema, LUEGO: Triggers.
-- IMPORTANTE: Este script usa businesses.loyalty_levels (JSONB), NO la tabla loyalty_levels.
-- ============================================================================

-- ============================================================================
-- FASE 1 — CORRECCIONES DE SCHEMA
-- ============================================================================

-- 1.1 Renombrar columna 'data' → 'metadata' en notifications
ALTER TABLE notifications RENAME COLUMN "data" TO "metadata";

-- 1.2 Actualizar CHECK constraint para aceptar los tipos del frontend
--     (level_up en lugar de new_level, reward_unlocked en lugar de reward_available)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('level_up', 'points_earned', 'reward_unlocked', 'promotion', 'general'));

-- 1.3 Eliminar función obsoleta
DROP FUNCTION IF EXISTS check_level_upgrade(UUID);


-- ============================================================================
-- FASE 2 — TRIGGERS DE NOTIFICACIONES
-- ============================================================================

-- --------------------------------------------------------------------------
-- 2.1  TRIGGER: Subida de nivel (level_up)
--      Lee businesses.loyalty_levels JSONB.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_level_up_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_new_name       TEXT;
  v_new_color      TEXT;
  v_new_mult       NUMERIC;
  v_new_disc       INTEGER;
  v_new_perks      JSONB;
  v_new_min_pts    INTEGER;
  v_old_level_name TEXT;
BEGIN
  -- Solo proceder si total_points_earned cambió
  IF NEW.total_points_earned IS NOT DISTINCT FROM OLD.total_points_earned THEN
    RETURN NEW;
  END IF;

  -- Buscar nivel más alto desde businesses.loyalty_levels JSONB
  SELECT
    ld->>'name'              AS name,
    ld->>'color'             AS color,
    (ld->>'min_points')::int AS min_points,
    (ld->>'multiplier')::numeric AS multiplier,
    (ld->>'discount_percent')::int AS discount_percent,
    ld->'perks'              AS perks
  INTO v_new_name, v_new_color, v_new_min_pts, v_new_mult, v_new_disc, v_new_perks
  FROM businesses b,
       LATERAL jsonb_array_elements(b.loyalty_levels) AS ld
  WHERE b.id = NEW.business_id
    AND (ld->>'min_points')::int <= NEW.total_points_earned
  ORDER BY (ld->>'min_points')::int DESC
  LIMIT 1;

  -- Si no hay niveles configurados, salir
  IF v_new_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Si ya está en ese nivel, salir
  IF NEW.current_level = v_new_name THEN
    RETURN NEW;
  END IF;

  -- Actualizar current_level
  NEW.current_level := v_new_name;
  NEW.updated_at := now();

  -- Insertar notificación
  INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
  VALUES (
    NEW.user_id,
    NEW.business_id,
    'level_up',
    '¡Subiste a ' || v_new_name || '!',
    'Felicitaciones, alcanzaste el nivel ' || v_new_name || '.',
    jsonb_build_object(
      'level_name', v_new_name,
      'color', v_new_color,
      'multiplier', v_new_mult,
      'discount_percent', v_new_disc,
      'perks', v_new_perks,
      'min_points', v_new_min_pts
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_level_up ON loyalty_cards;
CREATE TRIGGER trg_level_up
  BEFORE UPDATE OF total_points_earned ON loyalty_cards
  FOR EACH ROW
  EXECUTE FUNCTION trg_level_up_fn();


-- --------------------------------------------------------------------------
-- 2.2  TRIGGER: Puntos ganados (points_earned)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_points_earned_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_business_name TEXT;
BEGIN
  IF NEW.type <> 'earned' THEN
    RETURN NEW;
  END IF;

  SELECT lc.user_id, lc.business_id INTO v_user_id, v_business_id
  FROM loyalty_cards lc WHERE lc.id = NEW.loyalty_card_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT name INTO v_business_name FROM businesses WHERE id = v_business_id;

  INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
  VALUES (
    v_user_id, v_business_id, 'points_earned',
    '¡Puntos ganados!',
    'Ganaste +' || NEW.points || ' puntos en ' || COALESCE(v_business_name, 'un negocio') || '.',
    jsonb_build_object('points', NEW.points, 'business_name', v_business_name, 'description', NEW.description)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_points_earned ON point_transactions;
CREATE TRIGGER trg_points_earned
  AFTER INSERT ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trg_points_earned_fn();


-- --------------------------------------------------------------------------
-- 2.3  TRIGGER: Tarjeta de lealtad creada
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_card_created_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_business_name TEXT;
BEGIN
  SELECT name INTO v_business_name FROM businesses WHERE id = NEW.business_id;

  INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
  VALUES (
    NEW.user_id, NEW.business_id, 'general',
    '¡Nueva tarjeta de lealtad!',
    COALESCE(v_business_name, 'Un negocio') || ' te ha creado una tarjeta de lealtad.',
    jsonb_build_object('business_name', v_business_name, 'card_number', NEW.card_number)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_card_created ON loyalty_cards;
CREATE TRIGGER trg_card_created
  AFTER INSERT ON loyalty_cards
  FOR EACH ROW
  EXECUTE FUNCTION trg_card_created_fn();


-- --------------------------------------------------------------------------
-- 2.4  TRIGGER: Recompensa canjeada
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_reward_redeemed_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id       UUID;
  v_business_id   UUID;
  v_owner_id      UUID;
  v_business_name TEXT;
  v_reward_name   TEXT;
BEGIN
  SELECT lc.user_id, lc.business_id INTO v_user_id, v_business_id
  FROM loyalty_cards lc WHERE lc.id = NEW.loyalty_card_id;

  SELECT name INTO v_reward_name FROM rewards WHERE id = NEW.reward_id;
  SELECT name, owner_id INTO v_business_name, v_owner_id FROM businesses WHERE id = v_business_id;

  -- a) Cliente
  INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
  VALUES (
    v_user_id, v_business_id, 'reward_unlocked',
    '¡Recompensa canjeada!',
    'Canjeaste ' || COALESCE(v_reward_name, 'una recompensa') || ' por ' || NEW.points_used || ' puntos en ' || COALESCE(v_business_name, 'un negocio') || '.',
    jsonb_build_object('reward_name', v_reward_name, 'points_used', NEW.points_used, 'business_name', v_business_name, 'redemption_code', NEW.redemption_code, 'status', NEW.status)
  );

  -- b) Dueño
  IF v_owner_id IS NOT NULL AND v_owner_id <> v_user_id THEN
    INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
    VALUES (
      v_owner_id, v_business_id, 'general',
      'Nuevo canje pendiente',
      'Un cliente canjeó ' || COALESCE(v_reward_name, 'una recompensa') || '. Código: ' || NEW.redemption_code || '.',
      jsonb_build_object('reward_name', v_reward_name, 'points_used', NEW.points_used, 'redemption_code', NEW.redemption_code, 'status', 'pending')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reward_redeemed ON reward_redemptions;
CREATE TRIGGER trg_reward_redeemed
  AFTER INSERT ON reward_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION trg_reward_redeemed_fn();


-- --------------------------------------------------------------------------
-- 2.5  TRIGGER: Canje resuelto
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_redemption_resolved_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id       UUID;
  v_business_id   UUID;
  v_business_name TEXT;
  v_reward_name   TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('claimed', 'expired') THEN RETURN NEW; END IF;

  SELECT lc.user_id, lc.business_id INTO v_user_id, v_business_id
  FROM loyalty_cards lc WHERE lc.id = NEW.loyalty_card_id;

  SELECT name INTO v_reward_name FROM rewards WHERE id = NEW.reward_id;
  SELECT name INTO v_business_name FROM businesses WHERE id = v_business_id;

  IF NEW.status = 'claimed' THEN
    INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
    VALUES (
      v_user_id, v_business_id, 'reward_unlocked',
      '¡Canje completado!',
      'Tu canje de ' || COALESCE(v_reward_name, 'una recompensa') || ' fue validado por ' || COALESCE(v_business_name, 'el negocio') || '.',
      jsonb_build_object('reward_name', v_reward_name, 'business_name', v_business_name, 'status', 'claimed')
    );
  ELSE
    INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
    VALUES (
      v_user_id, v_business_id, 'general',
      'Canje cancelado — puntos devueltos',
      'Tu canje de ' || COALESCE(v_reward_name, 'una recompensa') || ' fue cancelado. Se devolvieron ' || NEW.points_used || ' puntos.',
      jsonb_build_object('reward_name', v_reward_name, 'points_used', NEW.points_used, 'business_name', v_business_name, 'status', 'expired')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_redemption_resolved ON reward_redemptions;
CREATE TRIGGER trg_redemption_resolved
  AFTER UPDATE OF status ON reward_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION trg_redemption_resolved_fn();


-- --------------------------------------------------------------------------
-- 2.6  TRIGGER: Negocio aprobado
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_business_approved_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'active' THEN
    INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
    VALUES (
      NEW.owner_id, NEW.id, 'general',
      '¡Negocio aprobado!',
      'Tu negocio ' || NEW.name || ' ha sido aprobado. Ya podés gestionar tu programa de lealtad.',
      jsonb_build_object('business_name', NEW.name, 'business_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_business_approved ON businesses;
CREATE TRIGGER trg_business_approved
  AFTER UPDATE OF status ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION trg_business_approved_fn();


-- ============================================================================
-- FASE 3 — TRIGGER DE MULTIPLICADOR DE PUNTOS
--      Lee businesses.loyalty_levels JSONB.
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_apply_multiplier_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_multiplier NUMERIC;
BEGIN
  SELECT (ld->>'multiplier')::numeric INTO v_multiplier
  FROM loyalty_cards lc
  JOIN businesses b ON b.id = lc.business_id,
       LATERAL jsonb_array_elements(b.loyalty_levels) AS ld
  WHERE lc.id = NEW.loyalty_card_id
    AND ld->>'name' = lc.current_level
  LIMIT 1;

  IF FOUND AND v_multiplier IS NOT NULL AND v_multiplier > 1 THEN
    NEW.total_points := ROUND(NEW.total_points * v_multiplier);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_apply_multiplier ON purchases;
CREATE TRIGGER trg_apply_multiplier
  BEFORE INSERT ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION trg_apply_multiplier_fn();


-- ============================================================================
-- FASE 4 — ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = false;


-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE 'trg_%'
-- ORDER BY event_object_table;
