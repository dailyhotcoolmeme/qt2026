alter table public.push_subscriptions
  add column if not exists channel text not null default 'webpush',
  add column if not exists platform text,
  add column if not exists device_token text;

alter table public.push_subscriptions
  alter column subscription drop not null;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_endpoint_key;

create unique index if not exists push_subscriptions_channel_endpoint_uidx
  on public.push_subscriptions(channel, endpoint);

create table if not exists public.user_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  group_activity_enabled boolean not null default true,
  system_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_notification_settings enable row level security;

drop policy if exists user_notification_settings_select_policy on public.user_notification_settings;
create policy user_notification_settings_select_policy on public.user_notification_settings
for select
using (auth.uid() = user_id);

drop policy if exists user_notification_settings_insert_policy on public.user_notification_settings;
create policy user_notification_settings_insert_policy on public.user_notification_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists user_notification_settings_update_policy on public.user_notification_settings;
create policy user_notification_settings_update_policy on public.user_notification_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_notification_settings_delete_policy on public.user_notification_settings;
create policy user_notification_settings_delete_policy on public.user_notification_settings
for delete
using (auth.uid() = user_id);
