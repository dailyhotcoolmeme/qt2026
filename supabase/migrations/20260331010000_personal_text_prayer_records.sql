-- 개인 글기도 기록 테이블
CREATE TABLE IF NOT EXISTS public.personal_text_prayer_records (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prayer_date date NOT NULL,
  title text,
  content text NOT NULL DEFAULT '',
  image_urls jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS personal_text_prayer_records_user_date_idx
  ON public.personal_text_prayer_records(user_id, prayer_date);

ALTER TABLE public.personal_text_prayer_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_text_prayer_records_policy" ON public.personal_text_prayer_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
