-- sharing_posts 테이블 RLS 활성화
ALTER TABLE public.sharing_posts ENABLE ROW LEVEL SECURITY;

-- authenticated 사용자만 읽기 허용
CREATE POLICY "sharing_posts_select_authenticated"
  ON public.sharing_posts
  FOR SELECT
  TO authenticated
  USING (true);

-- 본인 데이터만 삽입 허용
CREATE POLICY "sharing_posts_insert_own"
  ON public.sharing_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 본인 데이터만 수정 허용
CREATE POLICY "sharing_posts_update_own"
  ON public.sharing_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 본인 데이터만 삭제 허용
CREATE POLICY "sharing_posts_delete_own"
  ON public.sharing_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
