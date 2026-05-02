-- ============================================
-- ZUMA - ACTUALIZAR STATUS DE NEGOCIOS
-- ============================================
-- Ejecutar en SQL Editor de Supabase
-- 
-- Este script:
-- 1. Agrega 'pending' al CHECK constraint de status
-- 2. Cambia el DEFAULT a 'pending'
-- 3. Verifica los cambios
--
-- Ejecución: ~2-5 segundos
-- ============================================

BEGIN;

-- ============================================
-- 1. ACTUALIZAR CHECK CONSTRAINT
-- ============================================
-- Eliminar el constraint existente (si existe)
ALTER TABLE businesses 
  DROP CONSTRAINT IF EXISTS businesses_status_check;

-- Agregar nuevo constraint con 'pending' incluido
ALTER TABLE businesses 
  ADD CONSTRAINT businesses_status_check 
  CHECK (status IN ('pending', 'active', 'inactive', 'suspended'));

-- ============================================
-- 2. CAMBIAR DEFAULT A 'pending'
-- ============================================
ALTER TABLE businesses 
  ALTER COLUMN status SET DEFAULT 'pending';

-- ============================================
-- 3. VERIFICACIÓN
-- ============================================
-- Confirmar que los cambios se aplicaron correctamente

-- Verificar column default
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'businesses' 
  AND column_name = 'status';

-- Verificar check constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'businesses'::regclass 
  AND contype = 'c';

COMMIT;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- ✅ Los negocios existentes mantienen su status actual
-- ✅ Nuevos negocios creados tendrán status='pending' por defecto
-- ✅ El admin debe ejecutar manualmente:
--    UPDATE businesses SET status='active' WHERE id='business-uuid';
-- ============================================
