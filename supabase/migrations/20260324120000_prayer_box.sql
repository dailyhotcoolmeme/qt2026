-- 내 기도제목함: 사용자가 저장한 기도제목 레퍼런스
CREATE TABLE IF NOT EXISTS prayer_box (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  topic_id bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

ALTER TABLE prayer_box ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_prayer_box" ON prayer_box
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
