-- ============================================
-- COMPARE BOTH TABLES DATA AND STRUCTURE
-- ============================================

-- 1. Check if the same card exists in both tables
SELECT 
  'loyalty_cards' as table_name,
  id,
  user_id,
  business_id,
  card_number,
  current_points,
  total_visits,
  issued_at,
  updated_at
FROM loyalty_cards
WHERE business_id = '456439e3-7493-40bf-a971-80958accd4cf'

UNION ALL

SELECT 
  'user_cards' as table_name,
  id,
  user_id,
  business_id,
  card_number,
  current_points,
  total_visits,
  issued_at,
  updated_at
FROM user_cards
WHERE business_id = '456439e3-7493-40bf-a971-80958accd4cf';

-- 2. Check if user_cards has the extra columns
SELECT 
  id,
  user_id,
  business_id,
  card_number,
  business_name,
  business_category,
  issued_at,
  updated_at
FROM user_cards
WHERE business_id = '456439e3-7493-40bf-a971-80958accd4cf'
LIMIT 1;

-- 3. Check constraints on both tables
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
WHERE tc.table_name IN ('loyalty_cards', 'user_cards')
  AND tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;
