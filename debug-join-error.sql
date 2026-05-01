-- ============================================
-- DEBUG JOIN QUERY 400 ERROR
-- ============================================

-- 1. Test the exact query that's failing in PostgREST
SELECT 
  lc.id,
  lc.card_number,
  lc.current_points,
  lc.total_visits,
  lc.issued_at,
  lc.user_id,
  p.name,
  p.email,
  p.username
FROM loyalty_cards lc
LEFT JOIN profiles p ON lc.user_id = p.id
WHERE lc.business_id = '456439e3-7493-40bf-a971-80958accd4cf'
ORDER BY lc.issued_at DESC
LIMIT 5;

-- 2. Check if the foreign key constraint exists and is properly configured
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_type,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.constraint_schema = rc.constraint_schema
WHERE tc.table_name = 'loyalty_cards'
  AND tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id';

-- 3. Check if profiles table has the user_id column as primary key
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name = 'id'
ORDER BY ordinal_position;

-- 4. Check if there are any RLS policies that might interfere
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('loyalty_cards', 'profiles')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Test a simpler JOIN to isolate the issue
SELECT COUNT(*) as join_count
FROM loyalty_cards lc
LEFT JOIN profiles p ON lc.user_id = p.id
WHERE lc.business_id = '456439e3-7493-40bf-a971-80958accd4cf';

-- 6. Check PostgREST schema information
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'loyalty_cards' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
