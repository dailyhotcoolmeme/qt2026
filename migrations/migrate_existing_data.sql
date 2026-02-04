-- Optional migration script for existing meditation records
-- This script attempts to populate verse_display_date for existing records
-- by matching the verse field with daily_qt_verses table

-- IMPORTANT NOTES:
-- 1. Review and test this script in a non-production environment first!
-- 2. The verse field format must match exactly: "bible_name chapter:verse"
--    Example: "시편 23:1-6" or "창세기 1:1"
-- 3. If verse formats vary (extra spaces, different delimiters), you may need to
--    adjust the matching logic or clean the data first
-- 4. Records that don't match will remain with NULL verse_display_date

-- Update meditations where verse_display_date is NULL
-- by matching the verse field format with daily_qt_verses
UPDATE meditations m
SET verse_display_date = dqv.display_date
FROM daily_qt_verses dqv
WHERE m.verse_display_date IS NULL
  AND m.verse IS NOT NULL
  AND m.verse = dqv.bible_name || ' ' || dqv.chapter || ':' || dqv.verse;

-- Check how many records were updated
SELECT 
  COUNT(*) as total_meditations,
  COUNT(verse_display_date) as with_display_date,
  COUNT(*) - COUNT(verse_display_date) as missing_display_date
FROM meditations;

-- View records that couldn't be matched (for manual review)
-- These may have formatting differences or reference verses not in daily_qt_verses
SELECT 
  id,
  verse,
  created_at,
  verse_display_date
FROM meditations
WHERE verse_display_date IS NULL
  AND verse IS NOT NULL
ORDER BY created_at DESC
LIMIT 50;
