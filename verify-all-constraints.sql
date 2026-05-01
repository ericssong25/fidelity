-- ============================================
-- VERIFY ALL CONSTRAINTS AND RELATIONSHIPS
-- ============================================

-- 1. Check all foreign key constraints on loyalty_cards
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
ORDER BY constraint_name;

-- 2. Check if user_id constraint specifically exists
SELECT 
  constraint_name,
  table_name,
  column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'loyalty_cards' 
  AND kcu.column_name = 'user_id'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 3. Check profiles table structure again
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check loyalty_cards table structure again
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'loyalty_cards' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Test the JOIN query directly
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
  p.username
FROM loyalty_cards lc
LEFT JOIN profiles p ON lc.user_id = p.id
LIMIT 1;

-- 6. Check if there are any loyalty cards at all
SELECT COUNT(*) as total_cards FROM loyalty_cards;

-- 7. Check if there are any profiles
SELECT COUNT(*) as total_profiles FROM profiles;
