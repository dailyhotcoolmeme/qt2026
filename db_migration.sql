-- 기존 테이블 삭제
DROP TABLE IF EXISTS daily_verses;
DROP TABLE IF EXISTS reading_history;

-- 새 테이블: user_reading_records (사용자별 날짜별 읽은 말씀 기록)
CREATE TABLE user_reading_records (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  book_name TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  start_verse INTEGER,
  end_verse INTEGER,
  read_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_date UNIQUE(user_id, date)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX idx_user_reading_records_user_date ON user_reading_records(user_id, date);
CREATE INDEX idx_user_reading_records_book ON user_reading_records(book_name, chapter);

-- RLS 정책 설정
ALTER TABLE user_reading_records ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 조회 가능
CREATE POLICY "Users can view own reading records" ON user_reading_records
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 데이터만 삽입 가능
CREATE POLICY "Users can insert own reading records" ON user_reading_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 데이터만 업데이트 가능
CREATE POLICY "Users can update own reading records" ON user_reading_records
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 데이터만 삭제 가능
CREATE POLICY "Users can delete own reading records" ON user_reading_records
  FOR DELETE USING (auth.uid() = user_id);
