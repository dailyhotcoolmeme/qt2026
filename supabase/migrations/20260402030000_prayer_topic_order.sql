-- group-prayer-topic-item-order:{groupId}:{userId} (내 기도제목 순서)
-- group-prayer-topic-order:{groupId}:{userId}      (저자별 순서)
-- 두 localStorage 키를 모두 대체
CREATE TABLE IF NOT EXISTS user_prayer_topic_order (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  ordered_topic_ids jsonb NOT NULL DEFAULT '[]',   -- number[]  내 기도제목 ID 순서
  ordered_author_ids jsonb NOT NULL DEFAULT '[]',  -- string[]  저자 userId 순서
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

ALTER TABLE user_prayer_topic_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_prayer_topic_order_all" ON user_prayer_topic_order
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
