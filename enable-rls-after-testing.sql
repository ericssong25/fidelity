-- ============================================
-- RE-ENABLE RLS AFTER TESTING
-- ============================================

-- 1. Re-enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- 2. Verify RLS is re-enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'loyalty_cards', 'businesses')
  AND schemaname = 'public'
ORDER BY tablename;
