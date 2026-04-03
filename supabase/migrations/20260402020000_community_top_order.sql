-- community-top-order:{userId} localStorage 대체
-- 커뮤니티 최상위 표시 순서 (폴더 + 비폴더 그룹 혼합 순서)
CREATE TABLE IF NOT EXISTS user_community_top_order (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ordered_ids jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_community_top_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_community_top_order_all" ON user_community_top_order
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
