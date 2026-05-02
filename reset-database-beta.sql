-- ============================================
-- ZUMA - RESET COMPLETO PARA BETA TEST
-- ============================================
-- Ejecutar en SQL Editor de Supabase
-- 
-- ADVERTENCIA: Esto borrará TODOS los datos de la aplicación
-- Las tablas quedarán vacías y los IDs reiniciarán desde 1
--
-- Ejecución: ~5-10 segundos
-- ============================================

BEGIN;

-- ============================================
-- 1. BORRAR DATOS EN ORDEN (con CASCADE)
-- ============================================
-- El orden importa para evitar conflictos de foreign keys
-- CASCADE asegura que se borren datos relacionados aunque el orden no sea perfecto

-- Nivel 1: Tablas con dependencias profundas
TRUNCATE TABLE promotion_usages RESTART IDENTITY CASCADE;
TRUNCATE TABLE purchase_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE reward_redemptions RESTART IDENTITY CASCADE;
TRUNCATE TABLE point_transactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE purchases RESTART IDENTITY CASCADE;
TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;

-- Nivel 2: Tablas de negocio principal
TRUNCATE TABLE loyalty_cards RESTART IDENTITY CASCADE;
TRUNCATE TABLE rewards RESTART IDENTITY CASCADE;
TRUNCATE TABLE promotions RESTART IDENTITY CASCADE;
TRUNCATE TABLE products RESTART IDENTITY CASCADE;
TRUNCATE TABLE business_hours RESTART IDENTITY CASCADE;
TRUNCATE TABLE loyalty_levels RESTART IDENTITY CASCADE;
TRUNCATE TABLE loyalty_programs RESTART IDENTITY CASCADE;

-- Nivel 3: Tablas raíz
TRUNCATE TABLE businesses RESTART IDENTITY CASCADE;
TRUNCATE TABLE profiles RESTART IDENTITY CASCADE;

-- ============================================
-- 2. VERIFICACIÓN DE RESET
-- ============================================
-- Ejecutar estas consultas para confirmar que las tablas están vacías

COMMIT;

-- ============================================
-- 3. CONSULTAS DE VERIFICACIÓN (opcional)
-- ============================================
-- Copia y pega estas consultas después de ejecutar el script para verificar

-- Contar registros en cada tabla
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL SELECT 'businesses', COUNT(*) FROM businesses
UNION ALL SELECT 'business_hours', COUNT(*) FROM business_hours
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'loyalty_levels', COUNT(*) FROM loyalty_levels
UNION ALL SELECT 'loyalty_programs', COUNT(*) FROM loyalty_programs
UNION ALL SELECT 'loyalty_cards', COUNT(*) FROM loyalty_cards
UNION ALL SELECT 'point_transactions', COUNT(*) FROM point_transactions
UNION ALL SELECT 'purchases', COUNT(*) FROM purchases
UNION ALL SELECT 'purchase_items', COUNT(*) FROM purchase_items
UNION ALL SELECT 'rewards', COUNT(*) FROM rewards
UNION ALL SELECT 'reward_redemptions', COUNT(*) FROM reward_redemptions
UNION ALL SELECT 'promotions', COUNT(*) FROM promotions
UNION ALL SELECT 'promotion_usages', COUNT(*) FROM promotion_usages
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
ORDER BY table_name;

-- ============================================
-- 4. LIMPIEZA DE USUARIOS DE AUTH (OPCIONAL)
-- ============================================
-- ⚠️ ADVERTENCIA: Esto borrará usuarios de Supabase Auth permanentemente
-- Solo ejecutar si quieres eliminar TODOS los usuarios registrados
--
-- Descomenta las siguientes líneas si deseas hacer esto:
--
-- DELETE FROM auth.users;
--
-- ============================================

-- ============================================
-- 5. PRÓXIMOS PASOS DESPUÉS DEL RESET
-- ============================================
-- 1. Verifica que todas las tablas muestran row_count = 0
-- 2. En la app, regístrate como nuevo usuario (o usa uno existente)
-- 3. Crea tu negocio desde el Business Dashboard
-- 4. Configura productos, niveles de lealtad, recompensas
-- 5. ¡Listo para beta test!
-- ============================================
