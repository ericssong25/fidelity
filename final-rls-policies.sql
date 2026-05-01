-- ============================================
-- FINAL RLS POLICIES - Working Structure
-- ============================================

-- 1. Enable RLS on both tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON loyalty_cards;
DROP POLICY IF EXISTS "Users can view own cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Business owners can view customer cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Users can create own cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Business owners can create customer cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Business owners can update customer cards" ON loyalty_cards;

-- 3. Create profiles policies using user_id column
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Create loyalty_cards policies for business owners
CREATE POLICY "Business owners can view customer cards" ON loyalty_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE id = loyalty_cards.business_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can create customer cards" ON loyalty_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE id = loyalty_cards.business_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update customer cards" ON loyalty_cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE id = loyalty_cards.business_id AND owner_id = auth.uid()
    )
  );

-- 5. Allow users to view their own cards
CREATE POLICY "Users can view own cards" ON loyalty_cards
  FOR SELECT USING (auth.uid() = user_id);

-- 6. Test query to verify the relationship works
SELECT 
  lc.id as card_id,
  lc.card_number,
  lc.current_points,
  lc.total_visits,
  lc.issued_at,
  lc.user_id,
  p.id as profile_id,
  p.name,
  p.email,
  p.username,
  p.user_id as profile_user_id
FROM loyalty_cards lc
LEFT JOIN profiles p ON lc.user_id = p.id
LIMIT 5;

-- 7. Verify foreign key constraint exists
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'loyalty_cards'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 8. Show all policies
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
WHERE tablename IN ('profiles', 'loyalty_cards')
ORDER BY tablename, policyname;
