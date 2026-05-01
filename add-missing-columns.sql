-- ============================================
-- AGREGAR COLUMNAS FALTANTES A loyalty_cards
-- ============================================

-- Verificar columnas actuales
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'loyalty_cards';

-- Agregar columnas faltantes
ALTER TABLE loyalty_cards 
  ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit TIMESTAMP WITH TIME ZONE;

-- Verificar que se agregaron
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'loyalty_cards';
