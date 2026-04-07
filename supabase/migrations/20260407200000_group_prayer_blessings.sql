-- God Bless You 기능: 기도제목 소유자가 기도해준 사람에게 감사 이모지 전송
CREATE TABLE public.group_prayer_blessings (
  id bigserial primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  record_id bigint not null,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (record_id, from_user_id)
);
ALTER TABLE public.group_prayer_blessings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blessings_select" ON public.group_prayer_blessings FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "blessings_insert" ON public.group_prayer_blessings FOR INSERT
  WITH CHECK (from_user_id = auth.uid());
