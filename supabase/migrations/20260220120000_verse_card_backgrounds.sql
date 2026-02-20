-- 사용자 배경 이미지 오픈형 테이블 생성
create table if not exists public.verse_card_backgrounds (
  id bigserial primary key,
  url text not null,
  name text not null,
  uploader text not null,
  created_at timestamptz not null default now()
);

-- 공개 읽기 정책 (누구나 조회 가능)
alter table public.verse_card_backgrounds enable row level security;
drop policy if exists verse_card_backgrounds_select_policy on public.verse_card_backgrounds;
create policy verse_card_backgrounds_select_policy on public.verse_card_backgrounds
for select using (true);

drop policy if exists verse_card_backgrounds_insert_policy on public.verse_card_backgrounds;
create policy verse_card_backgrounds_insert_policy on public.verse_card_backgrounds
for insert with check (true);
