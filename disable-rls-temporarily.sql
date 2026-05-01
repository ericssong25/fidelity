-- ============================================
-- DISABLE RLS TEMPORARILY FOR TESTING
-- ============================================

-- 1. Disable RLS on both tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;

-- 2. Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'loyalty_cards', 'businesses')
  AND schemaname = 'public'
ORDER BY tablename;

-- 3. Check existing users in profiles table
SELECT 
  id,
  user_id,
  name,
  email,
  username,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 4. Check if there are any auth users
SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
