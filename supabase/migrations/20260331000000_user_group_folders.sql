-- 사용자 그룹 폴더 테이블
CREATE TABLE IF NOT EXISTS user_group_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 그룹 폴더 아이템 테이블
CREATE TABLE IF NOT EXISTS user_group_folder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES user_group_folders(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(folder_id, group_id)
);

-- RLS 활성화
ALTER TABLE user_group_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_folder_items ENABLE ROW LEVEL SECURITY;

-- user_group_folders 정책
CREATE POLICY "user_group_folders_select" ON user_group_folders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_group_folders_insert" ON user_group_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_group_folders_update" ON user_group_folders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_group_folders_delete" ON user_group_folders
  FOR DELETE USING (auth.uid() = user_id);

-- user_group_folder_items 정책
CREATE POLICY "user_group_folder_items_select" ON user_group_folder_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_group_folder_items_insert" ON user_group_folder_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_group_folder_items_delete" ON user_group_folder_items
  FOR DELETE USING (auth.uid() = user_id);
