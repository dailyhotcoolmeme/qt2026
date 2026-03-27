-- 내 기도제목함 스냅샷 테이블
-- 저장 시점의 마음기도/글기도/음성기도 데이터를 통째로 복사 보관
-- 그룹 탈퇴 후에도 영구 열람 가능
CREATE TABLE IF NOT EXISTS public.prayer_box_items (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'group',     -- 'group' | 'personal'
  source_topic_id bigint,                         -- group_prayer_topics.id (dedup 기준)
  group_name text,
  topic_content text NOT NULL DEFAULT '',
  heart_count integer NOT NULL DEFAULT 0,
  heart_prayers jsonb NOT NULL DEFAULT '[]',      -- [{display_name, created_at}]
  text_prayers jsonb NOT NULL DEFAULT '[]',       -- [{display_name, prayer_text, created_at}]
  voice_prayers jsonb NOT NULL DEFAULT '[]',      -- [{display_name, audio_url, audio_duration, created_at}]
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_topic_id)
);

CREATE INDEX IF NOT EXISTS prayer_box_items_user_idx
  ON public.prayer_box_items(user_id);

-- voice_prayers jsonb 검색용 GIN 인덱스 (audio_url 참조 확인)
CREATE INDEX IF NOT EXISTS prayer_box_items_voice_gin
  ON public.prayer_box_items USING gin(voice_prayers);

ALTER TABLE public.prayer_box_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prayer_box_items_user_policy" ON public.prayer_box_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
