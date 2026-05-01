-- ============================================
-- CHECK ALL CONSTRAINTS ON LOYALTY_CARDS TABLE
-- ============================================

-- 1. Check ALL foreign key constraints on loyalty_cards
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_type
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'loyalty_cards'
  AND tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY constraint_name;

-- 2. Check if user_id foreign key exists with a different name
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_type
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'loyalty_cards'
  AND tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id'
ORDER BY constraint_name;

-- 3. Check all constraints (not just foreign keys) on loyalty_cards
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  tc.constraint_type
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'loyalty_cards'
  AND tc.table_schema = 'public'
ORDER BY constraint_name, kcu.column_name;

-- 4. Test if PostgREST can see the relationship by trying a simple embedded query
-- This will show us if PostgREST recognizes the relationship
SELECT 
  'testing_postgrest_relationship' as test,
  lc.id,
  lc.user_id,
  p.id as profile_id,
  p.name
FROM loyalty_cards lc
LEFT JOIN profiles p ON lc.user_id = p.id
WHERE lc.business_id = '456439e3-7493-40bf-a971-80958accd4cf'
LIMIT 1;
