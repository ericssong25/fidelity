-- ============================================
-- CHECK WHICH TABLES EXIST AND THEIR DATA
-- ============================================

-- 1. Check if both tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('loyalty_cards', 'user_cards')
ORDER BY table_name;

-- 2. Check user_cards table structure and data
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_cards' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check loyalty_cards table structure and data
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'loyalty_cards' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check data in user_cards
SELECT COUNT(*) as user_cards_count FROM user_cards;

-- 5. Check data in loyalty_cards
SELECT COUNT(*) as loyalty_cards_count FROM loyalty_cards;

-- 6. Show sample data from both tables
SELECT 'user_cards' as table_name, id, user_id, business_id, card_number, created_at
FROM user_cards 
LIMIT 1;

SELECT 'loyalty_cards' as table_name, id, user_id, business_id, card_number, issued_at
FROM loyalty_cards 
LIMIT 1;
