-- ============================================
-- DISABLE RLS POLICIES TO TEST PERMISSIONS ISSUE
-- ============================================

-- 1. Disable RLS on both tables completely
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards DISABLE ROW LEVEL SECURITY;

-- 2. Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'loyalty_cards')
ORDER BY tablename;

-- 3. Test the JOIN query that was failing
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

-- 4. Refresh PostgREST schema cache after disabling RLS
NOTIFY pgrst, 'reload schema';

-- 5. Test a simple embedded query like the app uses
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

-- 6. Check current RLS policies (should be disabled but still exist)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('loyalty_cards', 'profiles')
  AND schemaname = 'public'
ORDER BY tablename, policyname;
