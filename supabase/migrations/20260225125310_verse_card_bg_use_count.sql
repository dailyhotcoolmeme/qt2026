-- verse_card_backgrounds 테이블에 사용 횟수 컬럼 추가
ALTER TABLE verse_card_backgrounds
  ADD COLUMN IF NOT EXISTS use_count INTEGER NOT NULL DEFAULT 0;

-- 원자적 use_count 증가 함수 (race condition 없이 안전하게 증가)
CREATE OR REPLACE FUNCTION increment_verse_card_bg_use_count(bg_url TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE verse_card_backgrounds
  SET use_count = use_count + 1
  WHERE url = bg_url;
END;
$$;

-- 인증된 사용자와 익명 사용자 모두 호출 가능
GRANT EXECUTE ON FUNCTION increment_verse_card_bg_use_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_verse_card_bg_use_count(TEXT) TO anon;
