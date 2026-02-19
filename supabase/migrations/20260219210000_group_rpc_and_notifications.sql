-- Reliable group dashboard RPCs + app notifications table
-- 2026-02-19

create extension if not exists pgcrypto;

alter table public.groups
  add column if not exists header_image_url text;

alter table public.groups
  add column if not exists header_color text default '#4A6741';

create or replace function public.get_group_member_snapshot(
  p_group_id uuid
)
returns table(
  id text,
  user_id uuid,
  role text,
  joined_at timestamptz,
  username text,
  nickname text,
  total_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'permission denied';
  end if;

  return query
  with owner_row as (
    select g.owner_id as user_id,
           'owner'::text as role,
           null::timestamptz as joined_at
    from public.groups g
    where g.id = p_group_id
      and g.owner_id is not null
  ),
  member_rows as (
    select gm.user_id,
           case
             when gm.user_id = g.owner_id then 'owner'::text
             else coalesce(gm.role, 'member')
           end as role,
           gm.joined_at
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.group_id = p_group_id
      and gm.user_id is not null
  ),
  combined as (
    select * from owner_row
    union all
    select * from member_rows
  ),
  dedup as (
    select distinct on (c.user_id)
      c.user_id,
      c.role,
      c.joined_at
    from combined c
    order by c.user_id,
      case c.role
        when 'owner' then 0
        when 'leader' then 1
        else 2
      end,
      c.joined_at asc nulls last
  )
  select
    concat('member-', d.user_id::text) as id,
    d.user_id,
    d.role,
    d.joined_at,
    p.username,
    p.nickname,
    count(*) over()::integer as total_count
  from dedup d
  left join public.profiles p on p.id = d.user_id
  order by
    case d.role
      when 'owner' then 0
      when 'leader' then 1
      else 2
    end,
    d.joined_at asc nulls last,
    d.user_id::text;
end;
$$;

grant execute on function public.get_group_member_snapshot(uuid) to authenticated;

create or replace function public.get_group_member_counts(
  p_group_ids uuid[]
)
returns table(
  group_id uuid,
  member_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;

  return query
  with target as (
    select distinct unnest(coalesce(p_group_ids, array[]::uuid[])) as group_id
  ),
  all_members as (
    select t.group_id, g.owner_id as user_id
    from target t
    join public.groups g on g.id = t.group_id
    where g.owner_id is not null

    union

    select gm.group_id, gm.user_id
    from public.group_members gm
    join target t on t.group_id = gm.group_id
    where gm.user_id is not null
  ),
  dedup as (
    select distinct am.group_id, am.user_id
    from all_members am
  )
  select d.group_id, count(*)::integer as member_count
  from dedup d
  group by d.group_id;
end;
$$;

grant execute on function public.get_group_member_counts(uuid[]) to authenticated;

create or replace function public.update_group_visual_settings(
  p_group_id uuid,
  p_group_image text,
  p_header_image_url text,
  p_header_color text
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.groups%rowtype;
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;

  if not public.is_group_manager(p_group_id) then
    raise exception 'permission denied';
  end if;

  update public.groups g
  set group_image = p_group_image,
      header_image_url = p_header_image_url,
      header_color = coalesce(nullif(trim(coalesce(p_header_color, '')), ''), g.header_color)
  where g.id = p_group_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'group not found';
  end if;

  return v_row;
end;
$$;

grant execute on function public.update_group_visual_settings(uuid, text, text, text) to authenticated;

create or replace function public.update_group_basic_settings(
  p_group_id uuid,
  p_name text,
  p_group_slug text,
  p_description text,
  p_group_type text,
  p_password text,
  p_group_image text
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.groups%rowtype;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;

  if not public.is_group_manager(p_group_id) then
    raise exception 'permission denied';
  end if;

  v_slug := lower(trim(coalesce(p_group_slug, '')));
  if v_slug = '' then
    raise exception 'group slug required';
  end if;

  if exists (
    select 1
    from public.groups g
    where g.group_slug = v_slug
      and g.id <> p_group_id
  ) then
    raise exception 'group slug already exists';
  end if;

  update public.groups g
  set name = trim(coalesce(p_name, g.name)),
      group_slug = v_slug,
      description = nullif(trim(coalesce(p_description, '')), ''),
      group_type = coalesce(nullif(trim(coalesce(p_group_type, '')), ''), g.group_type),
      password = case
        when p_password is null or trim(p_password) = '' then g.password
        else p_password
      end,
      group_image = coalesce(p_group_image, g.group_image)
  where g.id = p_group_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'group not found';
  end if;

  return v_row;
end;
$$;

grant execute on function public.update_group_basic_settings(uuid, text, text, text, text, text, text) to authenticated;

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  target_path text not null,
  event_key text,
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists app_notifications_user_event_key_uidx
  on public.app_notifications(user_id, event_key);

create index if not exists app_notifications_user_created_idx
  on public.app_notifications(user_id, created_at desc);

alter table public.app_notifications enable row level security;

drop policy if exists app_notifications_select_policy on public.app_notifications;
create policy app_notifications_select_policy on public.app_notifications
for select
using (auth.uid() = user_id);

drop policy if exists app_notifications_insert_policy on public.app_notifications;
create policy app_notifications_insert_policy on public.app_notifications
for insert
with check (auth.uid() = user_id);

drop policy if exists app_notifications_update_policy on public.app_notifications;
create policy app_notifications_update_policy on public.app_notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists app_notifications_delete_policy on public.app_notifications;
create policy app_notifications_delete_policy on public.app_notifications
for delete
using (auth.uid() = user_id);

-- Normalize group_members policies so owners/managers can read full member lists.
alter table public.group_members enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'group_members'
  loop
    execute format('drop policy if exists %I on public.group_members', p.policyname);
  end loop;
end;
$$;

create policy group_members_select_policy on public.group_members
for select
using (public.is_group_member(group_id) or public.is_scope_leader_for_group(group_id));

create policy group_members_insert_policy on public.group_members
for insert
with check (public.is_group_manager(group_id));

create policy group_members_update_policy on public.group_members
for update
using (public.is_group_manager(group_id))
with check (public.is_group_manager(group_id));

create policy group_members_delete_policy on public.group_members
for delete
using (public.is_group_manager(group_id) or user_id = auth.uid());

-- Keep join request creation deterministic and create manager notifications.
create or replace function public.create_group_join_request_with_password(
  p_group_id uuid,
  p_join_password text,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_group_password text;
  v_group_name text;
  v_is_closed boolean;
  v_request_id uuid;
  v_requester_name text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'login required' using errcode = 'P0001';
  end if;

  select g.name, g.password, coalesce(g.is_closed, false)
    into v_group_name, v_group_password, v_is_closed
  from public.groups g
  where g.id = p_group_id;

  if v_group_name is null then
    raise exception 'group not found' using errcode = 'P0001';
  end if;

  if v_is_closed then
    raise exception 'group is closed' using errcode = 'P0001';
  end if;

  if public.is_group_member(p_group_id) then
    raise exception 'already a member' using errcode = 'P0001';
  end if;

  if coalesce(v_group_password, '') <> coalesce(p_join_password, '') then
    raise exception 'invalid join password' using errcode = 'P0001';
  end if;

  delete from public.group_join_requests
  where group_id = p_group_id
    and user_id = v_user_id
    and status in ('approved', 'rejected');

  insert into public.group_join_requests (
    group_id,
    user_id,
    message,
    status,
    created_at,
    resolved_at,
    resolved_by
  )
  values (
    p_group_id,
    v_user_id,
    nullif(trim(p_message), ''),
    'pending',
    now(),
    null,
    null
  )
  on conflict (group_id, user_id, status)
  do update
     set message = excluded.message,
         created_at = now(),
         resolved_at = null,
         resolved_by = null
  returning id into v_request_id;

  select coalesce(nullif(trim(p.nickname), ''), nullif(trim(p.username), ''), '사용자')
    into v_requester_name
  from public.profiles p
  where p.id = v_user_id;
  v_requester_name := coalesce(v_requester_name, '사용자');

  insert into public.app_notifications (
    user_id,
    notification_type,
    title,
    message,
    target_path,
    event_key,
    payload
  )
  select
    managers.user_id,
    'join_pending',
    coalesce(v_group_name, '모임') || ' 가입 신청',
    v_requester_name || '님이 가입 신청을 보냈습니다.',
    '/group/' || p_group_id::text || '?tab=members',
    'join_pending:' || v_request_id::text || ':' || managers.user_id::text,
    jsonb_build_object(
      'type', 'join_pending',
      'groupId', p_group_id::text,
      'requestId', v_request_id::text
    )
  from (
    select distinct x.user_id
    from (
      select g.owner_id as user_id
      from public.groups g
      where g.id = p_group_id
      union all
      select gm.user_id
      from public.group_members gm
      where gm.group_id = p_group_id
        and gm.role in ('leader', 'owner')
    ) x
    where x.user_id is not null
      and x.user_id <> v_user_id
  ) managers
  on conflict (user_id, event_key) do nothing;

  return v_request_id;
end;
$$;

grant execute on function public.create_group_join_request_with_password(uuid, text, text) to authenticated;

drop function if exists public.resolve_group_join_request(uuid, boolean);
drop function if exists public.resolve_group_join_request(boolean, uuid);

create or replace function public.resolve_group_join_request(
  p_approve boolean,
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_target_user_id uuid;
  v_target_status text;
  v_group_name text;
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;

  select group_id, user_id
    into v_group_id, v_target_user_id
  from public.group_join_requests
  where id = p_request_id
    and status = 'pending'
  for update;

  if v_group_id is null or v_target_user_id is null then
    raise exception 'pending request not found';
  end if;

  if not public.is_group_manager(v_group_id) then
    raise exception 'permission denied';
  end if;

  v_target_status := case when p_approve then 'approved' else 'rejected' end;

  delete from public.group_join_requests
  where group_id = v_group_id
    and user_id = v_target_user_id
    and status = v_target_status
    and id <> p_request_id;

  if p_approve then
    insert into public.group_members (group_id, user_id, role)
    values (v_group_id, v_target_user_id, 'member')
    on conflict (group_id, user_id) do nothing;
  end if;

  update public.group_join_requests
  set status = v_target_status,
      resolved_at = now(),
      resolved_by = auth.uid()
  where id = p_request_id;

  select coalesce(g.name, '모임')
    into v_group_name
  from public.groups g
  where g.id = v_group_id;

  insert into public.app_notifications (
    user_id,
    notification_type,
    title,
    message,
    target_path,
    event_key,
    payload,
    is_read,
    read_at,
    created_at
  )
  values (
    v_target_user_id,
    case when p_approve then 'join_approved' else 'join_rejected' end,
    v_group_name || case when p_approve then ' 가입 승인' else ' 가입 거절' end,
    case
      when p_approve then '가입이 승인되었습니다. 모임으로 이동해 주세요.'
      else '가입 신청이 거절되었습니다.'
    end,
    case when p_approve then '/group/' || v_group_id::text else '/community?list=1' end,
    'join_result:' || p_request_id::text || ':' || v_target_status,
    jsonb_build_object(
      'type', case when p_approve then 'join_approved' else 'join_rejected' end,
      'groupId', v_group_id::text,
      'requestId', p_request_id::text,
      'status', v_target_status
    ),
    false,
    null,
    now()
  )
  on conflict (user_id, event_key)
  do update set
    notification_type = excluded.notification_type,
    title = excluded.title,
    message = excluded.message,
    target_path = excluded.target_path,
    payload = excluded.payload,
    is_read = false,
    read_at = null,
    created_at = now();
end;
$$;

grant execute on function public.resolve_group_join_request(boolean, uuid) to authenticated;

create or replace function public.leave_group(
  p_group_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_user_id uuid;
  v_group_name text;
  v_user_name text;
  v_event_key text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'login required';
  end if;

  select owner_id, coalesce(name, '모임')
    into v_owner_id, v_group_name
  from public.groups
  where id = p_group_id;

  if v_owner_id is null then
    raise exception 'group not found';
  end if;

  if v_owner_id = v_user_id then
    raise exception 'owner cannot leave group';
  end if;

  delete from public.group_members
  where group_id = p_group_id
    and user_id = v_user_id;

  if not found then
    raise exception 'member not found';
  end if;

  update public.group_join_requests
  set status = 'rejected',
      resolved_at = now(),
      resolved_by = v_user_id
  where group_id = p_group_id
    and user_id = v_user_id
    and status = 'pending';

  select coalesce(nullif(trim(p.nickname), ''), nullif(trim(p.username), ''), '모임원')
    into v_user_name
  from public.profiles p
  where p.id = v_user_id;
  v_user_name := coalesce(v_user_name, '모임원');
  v_event_key := 'member_left:' || p_group_id::text || ':' || v_user_id::text || ':' || extract(epoch from now())::bigint::text;

  insert into public.app_notifications (
    user_id,
    notification_type,
    title,
    message,
    target_path,
    event_key,
    payload
  )
  select
    managers.user_id,
    'member_left',
    v_group_name || ' 멤버 변경',
    v_user_name || '님이 모임에서 나갔습니다.',
    '/group/' || p_group_id::text || '?tab=members',
    v_event_key || ':' || managers.user_id::text,
    jsonb_build_object(
      'type', 'member_left',
      'groupId', p_group_id::text,
      'userId', v_user_id::text
    )
  from (
    select distinct x.user_id
    from (
      select g.owner_id as user_id
      from public.groups g
      where g.id = p_group_id
      union all
      select gm.user_id
      from public.group_members gm
      where gm.group_id = p_group_id
        and gm.role in ('leader', 'owner')
    ) x
    where x.user_id is not null
      and x.user_id <> v_user_id
  ) managers
  on conflict (user_id, event_key) do nothing;
end;
$$;

grant execute on function public.leave_group(uuid) to authenticated;
