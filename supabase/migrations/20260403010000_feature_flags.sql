-- feature_flags: DB에서 기능 on/off 제어 — 앱 업데이트 없이 기능 활성화/비활성화 가능
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

-- 누구나 읽을 수 있음 (기능 플래그는 공개 정보)
create policy "feature_flags_public_read"
  on public.feature_flags for select
  to anon, authenticated
  using (true);

-- 초기 플래그
insert into public.feature_flags (key, enabled, description) values
  ('ota_update', true, 'OTA 앱 업데이트 활성화')
on conflict (key) do nothing;
