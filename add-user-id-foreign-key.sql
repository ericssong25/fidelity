-- ============================================
-- ADD MISSING USER_ID FOREIGN KEY CONSTRAINT
-- ============================================

-- 1. Add the missing foreign key constraint for user_id
ALTER TABLE loyalty_cards 
ADD CONSTRAINT loyalty_cards_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id);

-- 2. Verify the constraint was created
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
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY constraint_name;

-- 3. Test the JOIN query again
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

-- 4. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
