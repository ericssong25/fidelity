-- ============================================================================
-- LIMPIEZA: Eliminar triggers duplicados que referencian loyalty_levels (tabla inexistente)
-- Los triggers originales (check_level_up, apply_points_multiplier) ya funcionan
-- correctamente con businesses.loyalty_levels JSONB.
-- ============================================================================

-- Eliminar mis triggers rotos (los que usan tabla loyalty_levels)
DROP TRIGGER IF EXISTS trg_level_up ON loyalty_cards;
DROP TRIGGER IF EXISTS trg_apply_multiplier ON purchases;

-- Eliminar mis funciones rotas
DROP FUNCTION IF EXISTS trg_level_up_fn();
DROP FUNCTION IF EXISTS trg_apply_multiplier_fn();

-- Verificar que solo queden los triggers buenos:
-- trigger_check_level_up  → llama a check_level_up()  (OK, usa JSONB)
-- trigger_apply_multiplier → llama a apply_points_multiplier() (OK, usa JSONB)
-- trg_card_created         → (OK, no usa loyalty_levels)
-- trg_points_earned        → (OK, no usa loyalty_levels)
-- trg_reward_redeemed      → (OK, no usa loyalty_levels)
-- trg_redemption_resolved  → (OK, no usa loyalty_levels)
-- trg_business_approved    → (OK, no usa loyalty_levels)
