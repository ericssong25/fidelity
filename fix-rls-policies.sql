-- ============================================
-- FIX RLS POLICIES - Error 406 Solution
-- ============================================

-- 1. Temporarily disable RLS to fix policies
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can create own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON businesses;

DROP POLICY IF EXISTS "Users can view own cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Business owners can view customer cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Users can create own cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Business owners can create customer cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Business owners can update customer cards" ON loyalty_cards;

-- 3. Re-enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;

-- 4. Create simplified policies for businesses
CREATE POLICY "Enable all for authenticated users" ON businesses
  FOR ALL USING (auth.role() = 'authenticated');

-- 5. Create simplified policies for loyalty_cards
CREATE POLICY "Enable all for authenticated users" ON loyalty_cards
  FOR ALL USING (auth.role() = 'authenticated');

-- 6. Test query to verify policies work
SELECT COUNT(*) as business_count 
FROM businesses 
WHERE owner_id = '250b6333-f3dc-4ff1-b236-cf581a70aa58';

-- ============================================
-- Alternative: More restrictive policies
-- ============================================

-- If you want more restrictive policies, uncomment these and comment out the simplified ones above:

/*
-- More restrictive business policies
CREATE POLICY "Users can view own businesses" ON businesses
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own businesses" ON businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own businesses" ON businesses
  FOR UPDATE USING (auth.uid() = owner_id);

-- More restrictive loyalty_cards policies
CREATE POLICY "Users can view own cards" ON loyalty_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Business owners can view customer cards" ON loyalty_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE id = loyalty_cards.business_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own cards" ON loyalty_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

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
*/

-- ============================================
-- Verification queries
-- ============================================

-- Check if policies exist
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
WHERE tablename IN ('businesses', 'loyalty_cards')
ORDER BY tablename, policyname;

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('businesses', 'loyalty_cards')
  AND schemaname = 'public';
