-- user_event_logs 테이블
create table if not exists public.user_event_logs (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  menu text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  platform text,
  created_at timestamptz not null default now()
);

create index if not exists user_event_logs_created_at_idx on public.user_event_logs(created_at desc);
create index if not exists user_event_logs_menu_action_idx on public.user_event_logs(menu, action);
create index if not exists user_event_logs_user_id_idx on public.user_event_logs(user_id);

-- profiles에 is_admin 추가
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- RLS
alter table public.user_event_logs enable row level security;

-- 누구든 insert 가능 (비로그인 포함)
create policy user_event_logs_insert_policy on public.user_event_logs
  for insert with check (true);

-- admin만 select 가능
create policy user_event_logs_select_policy on public.user_event_logs
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
