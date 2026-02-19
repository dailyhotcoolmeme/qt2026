-- Web Push subscription storage for VAPID delivery.
-- 2026-02-19

create table if not exists public.push_subscriptions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_error text
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id, updated_at desc);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_policy on public.push_subscriptions;
create policy push_subscriptions_select_policy on public.push_subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists push_subscriptions_insert_policy on public.push_subscriptions;
create policy push_subscriptions_insert_policy on public.push_subscriptions
for insert
with check (auth.uid() = user_id);

drop policy if exists push_subscriptions_update_policy on public.push_subscriptions;
create policy push_subscriptions_update_policy on public.push_subscriptions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists push_subscriptions_delete_policy on public.push_subscriptions;
create policy push_subscriptions_delete_policy on public.push_subscriptions
for delete
using (auth.uid() = user_id);
