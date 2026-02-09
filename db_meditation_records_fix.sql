-- user_meditation_records 테이블의 unique constraint 수정
-- 기존: user_id + date + meditation_type 조합이 unique (하루에 1개만 가능)
-- 수정: 제거하여 하루에 여러 개 기록 가능

-- 1. 기존 unique constraint 삭제
ALTER TABLE user_meditation_records 
DROP CONSTRAINT IF EXISTS user_meditation_records_user_id_date_meditation_type_key;

-- 2. 조회 성능을 위한 일반 인덱스 추가 (이미 있을 수도 있음)
CREATE INDEX IF NOT EXISTS idx_meditation_records_user_date_type 
ON user_meditation_records(user_id, date, meditation_type);

-- 3. 날짜별 정렬을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_meditation_records_created_at 
ON user_meditation_records(created_at DESC);
