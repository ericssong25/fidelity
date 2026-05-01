-- ============================================
-- REMOVE USER_CARDS TABLE - KEEP ONLY LOYALTY_CARDS
-- ============================================

-- 1. First, let's check if there are any triggers that might be creating duplicates
SELECT 
  event_object_table,
  trigger_name,
  action_timing,
  action_condition,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
  AND (event_object_table = 'loyalty_cards' OR event_object_table = 'user_cards');

-- 2. Drop user_cards table (this will also drop any triggers on it)
DROP TABLE IF EXISTS user_cards CASCADE;

-- 3. Verify user_cards is gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('loyalty_cards', 'user_cards')
ORDER BY table_name;

-- 4. Verify loyalty_cards still has all data
SELECT COUNT(*) as loyalty_cards_count FROM loyalty_cards;

-- 5. Refresh PostgREST schema cache after table removal
NOTIFY pgrst, 'reload schema';

-- 6. Test the JOIN query still works
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
