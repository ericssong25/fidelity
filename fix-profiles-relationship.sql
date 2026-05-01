-- ============================================
-- FIX PROFILES RELATIONSHIP - Error PGRST200 Solution
-- ============================================

-- 1. Check if profiles table exists
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check loyalty_cards table structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'loyalty_cards' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'loyalty_cards_user_id_fkey' 
    AND table_name = 'loyalty_cards'
  ) THEN
    ALTER TABLE loyalty_cards 
    ADD CONSTRAINT loyalty_cards_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id);
  END IF;
END $$;

-- 5. Create business foreign key if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'loyalty_cards_business_id_fkey' 
    AND table_name = 'loyalty_cards'
  ) THEN
    ALTER TABLE loyalty_cards 
    ADD CONSTRAINT loyalty_cards_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES businesses(id);
  END IF;
END $$;

-- 6. Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Create policies for loyalty_cards to enable profiles join
DROP POLICY IF EXISTS "Enable all for authenticated users" ON loyalty_cards;
DROP POLICY IF EXISTS "Users can view own cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Business owners can view customer cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Users can create own cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Business owners can create customer cards" ON loyalty_cards;
DROP POLICY IF EXISTS "Business owners can update customer cards" ON loyalty_cards;

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

-- 9. Test query to verify relationship works
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
LIMIT 1;

-- 10. Show all constraints to verify
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
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
WHERE tc.table_name IN ('loyalty_cards', 'profiles')
  AND tc.constraint_type = 'FOREIGN KEY';
