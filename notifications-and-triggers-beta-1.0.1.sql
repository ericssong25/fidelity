-- ============================================================================
-- ZUMA · Beta 1.0.1 — Notificaciones y triggers
-- ============================================================================
-- Ejecutar en el SQL Editor de Supabase, en orden.
-- PRIMERO: Correcciones de schema, LUEGO: Triggers.
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

-- 1.3 Actualizar la función check_level_upgrade para usar los nuevos tipos
--     (la reemplazamos más abajo como trigger, pero por si acaso)
DROP FUNCTION IF EXISTS check_level_upgrade(UUID);


-- ============================================================================
-- FASE 2 — TRIGGERS DE NOTIFICACIONES
-- ============================================================================

-- --------------------------------------------------------------------------
-- 2.1  TRIGGER: Subida de nivel (level_up)
--      Se dispara cuando total_points_earned cambia en loyalty_cards.
--      Recalcula current_level y, si subió, inserta notificación.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_level_up_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_new_level RECORD;
  v_old_level_name TEXT;
BEGIN
  -- Solo proceder si total_points_earned cambió
  IF NEW.total_points_earned IS NOT DISTINCT FROM OLD.total_points_earned THEN
    RETURN NEW;
  END IF;

  -- Buscar el nivel más alto que califica (basado en total_points_earned)
  SELECT id, name, color, multiplier, discount_percent, perks, min_points
  INTO v_new_level
  FROM loyalty_levels
  WHERE business_id = NEW.business_id
    AND min_points <= NEW.total_points_earned
  ORDER BY min_points DESC
  LIMIT 1;

  -- Si no hay niveles configurados, salir
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Nombre del nivel anterior (si tenía)
  SELECT name INTO v_old_level_name
  FROM loyalty_levels
  WHERE id = OLD.current_level_id;

  -- Si subió de nivel (o es la primera vez)
  IF v_new_level.id IS DISTINCT FROM OLD.current_level_id THEN
    -- Actualizar current_level en la tarjeta
    NEW.current_level_id := v_new_level.id;
    NEW.current_level := v_new_level.name;
    NEW.updated_at := now();

    -- Insertar notificación
    INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      NEW.business_id,
      'level_up',
      '¡Subiste a ' || v_new_level.name || '!',
      'Felicitaciones, alcanzaste el nivel ' || v_new_level.name || '.',
      jsonb_build_object(
        'level_name', v_new_level.name,
        'color', v_new_level.color,
        'multiplier', v_new_level.multiplier,
        'discount_percent', v_new_level.discount_percent,
        'perks', v_new_level.perks,
        'min_points', v_new_level.min_points
      )
    );
  END IF;

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
--      Se dispara al insertar una transacción de tipo 'earned'.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_points_earned_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_business_name TEXT;
BEGIN
  -- Solo para transacciones de tipo 'earned'
  IF NEW.type <> 'earned' THEN
    RETURN NEW;
  END IF;

  -- Obtener datos de la tarjeta
  SELECT lc.user_id, lc.business_id INTO v_user_id, v_business_id
  FROM loyalty_cards lc
  WHERE lc.id = NEW.loyalty_card_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Obtener nombre del negocio
  SELECT name INTO v_business_name
  FROM businesses
  WHERE id = v_business_id;

  -- Insertar notificación
  INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
  VALUES (
    v_user_id,
    v_business_id,
    'points_earned',
    '¡Puntos ganados!',
    'Ganaste +' || NEW.points || ' puntos en ' || COALESCE(v_business_name, 'un negocio') || '.',
    jsonb_build_object(
      'points', NEW.points,
      'business_name', v_business_name,
      'description', NEW.description
    )
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
-- 2.3  TRIGGER: Tarjeta de lealtad creada (general)
--      Se dispara al crear una loyalty_card.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_card_created_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_business_name TEXT;
BEGIN
  -- Obtener nombre del negocio
  SELECT name INTO v_business_name
  FROM businesses
  WHERE id = NEW.business_id;

  -- Insertar notificación
  INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
  VALUES (
    NEW.user_id,
    NEW.business_id,
    'general',
    '¡Nueva tarjeta de lealtad!',
    COALESCE(v_business_name, 'Un negocio') || ' te ha creado una tarjeta de lealtad. ¡Empezá a acumular puntos!',
    jsonb_build_object(
      'business_name', v_business_name,
      'card_number', NEW.card_number
    )
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
-- 2.4  TRIGGER: Recompensa canjeada (reward_unlocked + general al dueño)
--      Se dispara al insertar un reward_redemption.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_reward_redeemed_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_business_owner_id UUID;
  v_business_name TEXT;
  v_reward_name TEXT;
  v_points_used INTEGER;
BEGIN
  -- Obtener datos relacionados: tarjeta → usuario y negocio
  SELECT lc.user_id, lc.business_id INTO v_user_id, v_business_id
  FROM loyalty_cards lc
  WHERE lc.id = NEW.loyalty_card_id;

  v_points_used := NEW.points_used;

  -- Nombre del reward
  SELECT name INTO v_reward_name
  FROM rewards
  WHERE id = NEW.reward_id;

  -- Nombre y dueño del negocio
  SELECT name, owner_id INTO v_business_name, v_business_owner_id
  FROM businesses
  WHERE id = v_business_id;

  -- a) Notificar al cliente
  INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
  VALUES (
    v_user_id,
    v_business_id,
    'reward_unlocked',
    '¡Recompensa canjeada!',
    'Canjeaste ' || COALESCE(v_reward_name, 'una recompensa') || ' por ' || v_points_used || ' puntos en ' || COALESCE(v_business_name, 'un negocio') || '.',
    jsonb_build_object(
      'reward_name', v_reward_name,
      'points_used', v_points_used,
      'business_name', v_business_name,
      'redemption_code', NEW.redemption_code,
      'status', NEW.status
    )
  );

  -- b) Notificar al dueño del negocio (si existe y es distinto del cliente)
  IF v_business_owner_id IS NOT NULL AND v_business_owner_id <> v_user_id THEN
    INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
    VALUES (
      v_business_owner_id,
      v_business_id,
      'general',
      'Nuevo canje pendiente',
      'Un cliente canjeó ' || COALESCE(v_reward_name, 'una recompensa') || '. Código: ' || NEW.redemption_code || '. Validá el canje en Recompensas.',
      jsonb_build_object(
        'reward_name', v_reward_name,
        'points_used', v_points_used,
        'redemption_code', NEW.redemption_code,
        'status', 'pending'
      )
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
-- 2.5  TRIGGER: Canje resuelto (completado o cancelado)
--      Se dispara al cambiar el status de un reward_redemption.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_redemption_resolved_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_business_name TEXT;
  v_reward_name TEXT;
  v_points_used INTEGER;
BEGIN
  -- Solo disparar si el status realmente cambió
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Solo para claimed y expired
  IF NEW.status NOT IN ('claimed', 'expired') THEN
    RETURN NEW;
  END IF;

  -- Obtener datos
  SELECT lc.user_id, lc.business_id INTO v_user_id, v_business_id
  FROM loyalty_cards lc
  WHERE lc.id = NEW.loyalty_card_id;

  SELECT name INTO v_reward_name FROM rewards WHERE id = NEW.reward_id;
  SELECT name INTO v_business_name FROM businesses WHERE id = v_business_id;
  v_points_used := NEW.points_used;

  IF NEW.status = 'claimed' THEN
    -- Canje completado
    INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
    VALUES (
      v_user_id,
      v_business_id,
      'reward_unlocked',
      '¡Canje completado!',
      'Tu canje de ' || COALESCE(v_reward_name, 'una recompensa') || ' fue validado por ' || COALESCE(v_business_name, 'el negocio') || '. ¡Disfrutá tu recompensa!',
      jsonb_build_object(
        'reward_name', v_reward_name,
        'business_name', v_business_name,
        'status', 'claimed'
      )
    );
  ELSE
    -- Canje cancelado / expirado — puntos devueltos
    INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
    VALUES (
      v_user_id,
      v_business_id,
      'general',
      'Canje cancelado — puntos devueltos',
      'Tu canje de ' || COALESCE(v_reward_name, 'una recompensa') || ' fue cancelado. Se devolvieron ' || v_points_used || ' puntos a tu cuenta.',
      jsonb_build_object(
        'reward_name', v_reward_name,
        'points_used', v_points_used,
        'business_name', v_business_name,
        'status', 'expired'
      )
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
-- 2.6  TRIGGER: Negocio aprobado (general)
--      Se dispara cuando el status de un negocio cambia a 'active'.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_business_approved_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo disparar si pasó de 'pending' a 'active'
  IF OLD.status = 'pending' AND NEW.status = 'active' THEN
    INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
    VALUES (
      NEW.owner_id,
      NEW.id,
      'general',
      '¡Negocio aprobado!',
      'Tu negocio ' || NEW.name || ' ha sido aprobado. Ya podés acceder al panel de negocio y gestionar tu programa de lealtad.',
      jsonb_build_object(
        'business_name', NEW.name,
        'business_id', NEW.id
      )
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
-- ============================================================================

-- --------------------------------------------------------------------------
-- 3.1  TRIGGER: apply_points_multiplier
--      Antes de insertar una compra, multiplica total_points según
--      el multiplicador del nivel actual del cliente.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_apply_multiplier_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_multiplier NUMERIC;
BEGIN
  -- Buscar el multiplicador del nivel actual de la tarjeta
  SELECT ll.multiplier INTO v_multiplier
  FROM loyalty_cards lc
  JOIN loyalty_levels ll ON ll.id = lc.current_level_id
  WHERE lc.id = NEW.loyalty_card_id;

  -- Si encontró el multiplicador y es > 1, aplicarlo
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
-- FASE 4 — ÍNDICES ADICIONALES (si no existen)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_loyalty_cards_business_level
  ON loyalty_cards(business_id, current_level);


-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
-- Confirmar triggers creados:
--   SELECT trigger_name, event_manipulation, event_object_table
--   FROM information_schema.triggers
--   WHERE trigger_name LIKE 'trg_%'
--   ORDER BY event_object_table;
--
-- Confirmar columna renombrada:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'notifications' AND column_name IN ('metadata', 'data');
--
-- Confirmar constraint actualizado:
--   SELECT conname, consrc FROM pg_constraint
--   WHERE conrelid = 'notifications'::regclass AND contype = 'c';
-- ============================================================================
