-- user_group_folder_items 에 sort_order 컬럼 추가 (없을 경우에만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_group_folder_items' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE user_group_folder_items ADD COLUMN sort_order int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- UPDATE 정책 추가 (없을 경우에만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_group_folder_items' AND policyname = 'user_group_folder_items_update'
  ) THEN
    EXECUTE 'CREATE POLICY "user_group_folder_items_update" ON user_group_folder_items
      FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END $$;
