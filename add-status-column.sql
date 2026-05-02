-- ============================================
-- ZUMA - AÑADIR COLUMNA STATUS A BUSINESSES
-- ============================================
-- Ejecutar en SQL Editor de Supabase
--
-- Este script:
-- 1. Añade la columna status si no existe
-- 2. Agrega el CHECK constraint con pending
-- 3. Cambia el DEFAULT a 'pending'
-- ============================================

BEGIN;

-- ============================================
-- 1. AÑADIR COLUMNA STATUS (si no existe)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'businesses'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE businesses
      ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- ============================================
-- 2. ACTUALIZAR CHECK CONSTRAINT
-- ============================================
-- Eliminar constraint existente (si existe)
ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_status_check;

-- Agregar nuevo constraint con 'pending' incluido
ALTER TABLE businesses
  ADD CONSTRAINT businesses_status_check
  CHECK (status IN ('pending', 'active', 'inactive', 'suspended'));

-- ============================================
-- 3. CAMBIAR DEFAULT A 'pending'
-- ============================================
ALTER TABLE businesses
  ALTER COLUMN status SET DEFAULT 'pending';

-- ============================================
-- 4. ACTUALIZAR RLS POLICIES (si aplica)
-- ============================================
-- La policy existente filtra por status='active'
-- Si existe, actualizarla para incluir 'pending'
-- (El owner debe poder ver su negocio aunque esté pending)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'businesses'
      AND policyname = 'Anyone can view active businesses'
  ) THEN
    DROP POLICY IF EXISTS "Anyone can view active businesses" ON businesses;
    CREATE POLICY "Anyone can view active businesses" ON businesses
      FOR SELECT USING (status IN ('active', 'pending'));
  END IF;
END $$;

-- ============================================
-- 5. VERIFICACIÓN FINAL
-- ============================================
-- Confirmar columna
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'businesses'
  AND column_name = 'status';

-- Confirmar constraint
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'businesses'::regclass
  AND contype = 'c'
  AND conname = 'businesses_status_check';

-- Confirmar políticas
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'businesses'
ORDER BY policyname;

COMMIT;

-- ============================================
-- NOTAS
-- ============================================
-- ✅ Este script es seguro para ejecutar múltiples veces (idempotente)
-- ✅ No borra datos existentes
-- ✅ Los negocios existentes mantienen su status actual
-- ✅ Nuevos negocios creados por la app tendrán status='pending'
-- ✅ Para aprobar un negocio:
--    UPDATE businesses SET status='active' WHERE id='uuid-del-negocio';
-- ============================================
