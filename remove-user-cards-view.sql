-- ============================================
-- REMOVE USER_CARDS VIEW AND CLEAN UP
-- ============================================

-- 1. Check what type of object user_cards is
SELECT 
  table_name,
  table_type
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'user_cards';

-- 2. Drop user_cards if it's a view
DROP VIEW IF EXISTS user_cards CASCADE;

-- 3. Verify user_cards is completely gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('loyalty_cards', 'user_cards')
ORDER BY table_name;

-- 4. Also check views to make sure it's gone
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('loyalty_cards', 'user_cards')
ORDER BY table_name;

-- 5. Verify loyalty_cards still has all data
SELECT COUNT(*) as loyalty_cards_count FROM loyalty_cards;

-- 6. Refresh PostgREST schema cache after cleanup
NOTIFY pgrst, 'reload schema';

-- 7. Test the JOIN query still works
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
