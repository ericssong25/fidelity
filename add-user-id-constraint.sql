-- ============================================
-- ADD MISSING USER_ID FOREIGN KEY CONSTRAINT
-- ============================================

-- 1. Add the missing foreign key constraint for user_id
ALTER TABLE loyalty_cards 
ADD CONSTRAINT loyalty_cards_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id);

-- 2. Verify both foreign key constraints exist
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
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY constraint_name;

-- 3. Test the JOIN query to verify it works
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
LIMIT 1;

-- 4. Test the specific query that the CustomersPage uses
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
WHERE lc.business_id = 'YOUR_BUSINESS_ID_HERE' -- Replace with actual business ID
ORDER BY lc.issued_at DESC
LIMIT 5;
