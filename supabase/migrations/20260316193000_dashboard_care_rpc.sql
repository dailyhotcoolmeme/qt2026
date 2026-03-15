create or replace function public.get_dashboard_group_core_summary(
  p_days integer default 30,
  p_scope text default 'managed',
  p_group_id uuid default null
)
returns table(
  group_id uuid,
  group_name text,
  depth integer,
  member_count integer,
  pending_count integer,
  active_member_count integer,
  quiet_member_count integer,
  reading_count integer,
  qt_count integer,
  prayer_count integer,
  linked_count integer,
  direct_count integer,
  last_activity_at timestamptz,
  last_reading_at timestamptz,
  last_qt_at timestamptz,
  last_prayer_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_days integer := greatest(coalesce(p_days, 30), 1);
  v_scope text := coalesce(p_scope, 'managed');
begin
  if v_user_id is null then
    raise exception 'login required';
  end if;

  if p_group_id is null and v_scope not in ('managed', 'scope') then
    raise exception 'invalid scope';
  end if;

  if p_group_id is not null
    and not (
      public.is_group_member(p_group_id)
      or public.is_group_manager(p_group_id)
      or public.is_scope_leader_for_group(p_group_id)
    ) then
    raise exception 'access denied';
  end if;

  return query
  with accessible as (
    select distinct g.id as group_id, g.name as group_name, 0 as depth
    from public.groups g
    where p_group_id is not null
      and g.id = p_group_id

    union

    select distinct g.id as group_id, g.name as group_name, 0 as depth
    from public.groups g
    where p_group_id is null
      and v_scope = 'managed'
      and g.owner_id = v_user_id

    union

    select distinct g.id as group_id, g.name as group_name, 0 as depth
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where p_group_id is null
      and v_scope = 'managed'
      and gm.user_id = v_user_id
      and gm.role in ('leader', 'owner')

    union

    select distinct g.id as group_id, g.name as group_name, s.depth
    from public.get_scope_groups(v_user_id) s
    join public.groups g on g.id = s.group_id
    where p_group_id is null
      and v_scope = 'scope'
  ),
  member_base as (
    select a.group_id, g.owner_id as user_id
    from accessible a
    join public.groups g on g.id = a.group_id

    union

    select gm.group_id, gm.user_id
    from public.group_members gm
    join accessible a on a.group_id = gm.group_id
  ),
  member_stats as (
    select mb.group_id, count(distinct mb.user_id)::int as member_count
    from member_base mb
    where mb.user_id is not null
    group by mb.group_id
  ),
  pending_stats as (
    select gjr.group_id, count(*)::int as pending_count
    from public.group_join_requests gjr
    join accessible a on a.group_id = gjr.group_id
    where gjr.status = 'pending'
    group by gjr.group_id
  ),
  activity_rows as (
    select
      al.source_group_id as group_id,
      al.user_id,
      al.activity_type,
      al.occurred_at,
      'direct'::text as origin
    from public.activity_logs al
    join accessible a on a.group_id = al.source_group_id
    where al.source_kind = 'group_direct'
      and al.activity_type in ('reading', 'qt', 'prayer')
      and al.occurred_at >= now() - make_interval(days => v_days)

    union all

    select
      agl.group_id,
      al.user_id,
      al.activity_type,
      al.occurred_at,
      'linked'::text as origin
    from public.activity_group_links agl
    join public.activity_logs al on al.id = agl.activity_log_id
    join accessible a on a.group_id = agl.group_id
    where al.source_kind = 'personal'
      and al.activity_type in ('reading', 'qt', 'prayer')
      and al.occurred_at >= now() - make_interval(days => v_days)
  ),
  activity_stats as (
    select
      ar.group_id,
      count(distinct ar.user_id)::int as active_member_count,
      count(*) filter (where ar.activity_type = 'reading')::int as reading_count,
      count(*) filter (where ar.activity_type = 'qt')::int as qt_count,
      count(*) filter (where ar.activity_type = 'prayer')::int as prayer_count,
      count(*) filter (where ar.origin = 'linked')::int as linked_count,
      count(*) filter (where ar.origin = 'direct')::int as direct_count,
      max(ar.occurred_at) as last_activity_at,
      max(ar.occurred_at) filter (where ar.activity_type = 'reading') as last_reading_at,
      max(ar.occurred_at) filter (where ar.activity_type = 'qt') as last_qt_at,
      max(ar.occurred_at) filter (where ar.activity_type = 'prayer') as last_prayer_at
    from activity_rows ar
    group by ar.group_id
  )
  select
    a.group_id,
    a.group_name,
    a.depth,
    coalesce(ms.member_count, 0) as member_count,
    coalesce(ps.pending_count, 0) as pending_count,
    coalesce(ast.active_member_count, 0) as active_member_count,
    greatest(coalesce(ms.member_count, 0) - coalesce(ast.active_member_count, 0), 0) as quiet_member_count,
    coalesce(ast.reading_count, 0) as reading_count,
    coalesce(ast.qt_count, 0) as qt_count,
    coalesce(ast.prayer_count, 0) as prayer_count,
    coalesce(ast.linked_count, 0) as linked_count,
    coalesce(ast.direct_count, 0) as direct_count,
    ast.last_activity_at,
    ast.last_reading_at,
    ast.last_qt_at,
    ast.last_prayer_at
  from accessible a
  left join member_stats ms on ms.group_id = a.group_id
  left join pending_stats ps on ps.group_id = a.group_id
  left join activity_stats ast on ast.group_id = a.group_id
  order by a.depth asc, a.group_name asc;
end;
$$;

grant execute on function public.get_dashboard_group_core_summary(integer, text, uuid) to authenticated;

create or replace function public.get_dashboard_core_activity_timeline(
  p_days integer default 30,
  p_scope text default 'managed',
  p_group_id uuid default null
)
returns table(
  bucket_date date,
  reading_count integer,
  qt_count integer,
  prayer_count integer,
  linked_count integer,
  direct_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_days integer := greatest(coalesce(p_days, 30), 1);
  v_scope text := coalesce(p_scope, 'managed');
begin
  if v_user_id is null then
    raise exception 'login required';
  end if;

  if p_group_id is null and v_scope not in ('managed', 'scope') then
    raise exception 'invalid scope';
  end if;

  if p_group_id is not null
    and not (
      public.is_group_member(p_group_id)
      or public.is_group_manager(p_group_id)
      or public.is_scope_leader_for_group(p_group_id)
    ) then
    raise exception 'access denied';
  end if;

  return query
  with accessible as (
    select distinct g.id as group_id
    from public.groups g
    where p_group_id is not null
      and g.id = p_group_id

    union

    select distinct g.id as group_id
    from public.groups g
    where p_group_id is null
      and v_scope = 'managed'
      and g.owner_id = v_user_id

    union

    select distinct gm.group_id
    from public.group_members gm
    where p_group_id is null
      and v_scope = 'managed'
      and gm.user_id = v_user_id
      and gm.role in ('leader', 'owner')

    union

    select distinct s.group_id
    from public.get_scope_groups(v_user_id) s
    where p_group_id is null
      and v_scope = 'scope'
  ),
  calendar as (
    select generate_series(
      current_date - greatest(v_days - 1, 0),
      current_date,
      interval '1 day'
    )::date as bucket_date
  ),
  activity_rows as (
    select
      (al.occurred_at at time zone 'Asia/Seoul')::date as bucket_date,
      al.activity_type,
      'direct'::text as origin
    from public.activity_logs al
    join accessible a on a.group_id = al.source_group_id
    where al.source_kind = 'group_direct'
      and al.activity_type in ('reading', 'qt', 'prayer')
      and al.occurred_at >= now() - make_interval(days => v_days)

    union all

    select
      (al.occurred_at at time zone 'Asia/Seoul')::date as bucket_date,
      al.activity_type,
      'linked'::text as origin
    from public.activity_group_links agl
    join public.activity_logs al on al.id = agl.activity_log_id
    join accessible a on a.group_id = agl.group_id
    where al.source_kind = 'personal'
      and al.activity_type in ('reading', 'qt', 'prayer')
      and al.occurred_at >= now() - make_interval(days => v_days)
  )
  select
    c.bucket_date,
    coalesce(count(*) filter (where ar.activity_type = 'reading'), 0)::int as reading_count,
    coalesce(count(*) filter (where ar.activity_type = 'qt'), 0)::int as qt_count,
    coalesce(count(*) filter (where ar.activity_type = 'prayer'), 0)::int as prayer_count,
    coalesce(count(*) filter (where ar.origin = 'linked'), 0)::int as linked_count,
    coalesce(count(*) filter (where ar.origin = 'direct'), 0)::int as direct_count
  from calendar c
  left join activity_rows ar on ar.bucket_date = c.bucket_date
  group by c.bucket_date
  order by c.bucket_date asc;
end;
$$;

grant execute on function public.get_dashboard_core_activity_timeline(integer, text, uuid) to authenticated;

create or replace function public.get_dashboard_group_member_signals(
  p_group_id uuid,
  p_days integer default 30
)
returns table(
  user_id uuid,
  display_name text,
  avatar_url text,
  role text,
  reading_count integer,
  qt_count integer,
  prayer_count integer,
  linked_count integer,
  direct_count integer,
  last_activity_at timestamptz,
  last_reading_at timestamptz,
  last_qt_at timestamptz,
  last_prayer_at timestamptz,
  quiet_days integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_days integer := greatest(coalesce(p_days, 30), 1);
begin
  if v_user_id is null then
    raise exception 'login required';
  end if;

  if p_group_id is null then
    raise exception 'group required';
  end if;

  if not (
    public.is_group_manager(p_group_id)
    or public.is_scope_leader_for_group(p_group_id)
  ) then
    raise exception 'access denied';
  end if;

  return query
  with member_base as (
    select g.owner_id as user_id, 'owner'::text as role
    from public.groups g
    where g.id = p_group_id

    union all

    select gm.user_id, coalesce(gm.role, 'member') as role
    from public.group_members gm
    where gm.group_id = p_group_id
  ),
  ranked_members as (
    select
      mb.user_id,
      mb.role,
      row_number() over (
        partition by mb.user_id
        order by case mb.role when 'owner' then 3 when 'leader' then 2 else 1 end desc
      ) as rn
    from member_base mb
    where mb.user_id is not null
  ),
  members as (
    select
      rm.user_id,
      rm.role
    from ranked_members rm
    where rm.rn = 1
  ),
  activity_rows as (
    select
      al.user_id,
      al.activity_type,
      al.occurred_at,
      'direct'::text as origin
    from public.activity_logs al
    where al.source_kind = 'group_direct'
      and al.source_group_id = p_group_id
      and al.activity_type in ('reading', 'qt', 'prayer')
      and al.occurred_at >= now() - make_interval(days => v_days)

    union all

    select
      al.user_id,
      al.activity_type,
      al.occurred_at,
      'linked'::text as origin
    from public.activity_group_links agl
    join public.activity_logs al on al.id = agl.activity_log_id
    where agl.group_id = p_group_id
      and al.source_kind = 'personal'
      and al.activity_type in ('reading', 'qt', 'prayer')
      and al.occurred_at >= now() - make_interval(days => v_days)
  ),
  aggregated as (
    select
      ar.user_id,
      count(*) filter (where ar.activity_type = 'reading')::int as reading_count,
      count(*) filter (where ar.activity_type = 'qt')::int as qt_count,
      count(*) filter (where ar.activity_type = 'prayer')::int as prayer_count,
      count(*) filter (where ar.origin = 'linked')::int as linked_count,
      count(*) filter (where ar.origin = 'direct')::int as direct_count,
      max(ar.occurred_at) as last_activity_at,
      max(ar.occurred_at) filter (where ar.activity_type = 'reading') as last_reading_at,
      max(ar.occurred_at) filter (where ar.activity_type = 'qt') as last_qt_at,
      max(ar.occurred_at) filter (where ar.activity_type = 'prayer') as last_prayer_at
    from activity_rows ar
    group by ar.user_id
  )
  select
    m.user_id,
    coalesce(p.nickname, p.username, '모임원') as display_name,
    p.avatar_url,
    m.role,
    coalesce(a.reading_count, 0) as reading_count,
    coalesce(a.qt_count, 0) as qt_count,
    coalesce(a.prayer_count, 0) as prayer_count,
    coalesce(a.linked_count, 0) as linked_count,
    coalesce(a.direct_count, 0) as direct_count,
    a.last_activity_at,
    a.last_reading_at,
    a.last_qt_at,
    a.last_prayer_at,
    case
      when a.last_activity_at is null then v_days
      else greatest((current_date - ((a.last_activity_at at time zone 'Asia/Seoul')::date))::int, 0)
    end as quiet_days
  from members m
  left join public.profiles p on p.id = m.user_id
  left join aggregated a on a.user_id = m.user_id
  order by
    case
      when a.last_activity_at is null then 1
      when greatest((current_date - ((a.last_activity_at at time zone 'Asia/Seoul')::date))::int, 0) >= 14 then 0
      else 2
    end,
    coalesce(a.last_activity_at, 'epoch'::timestamptz) asc,
    coalesce(p.nickname, p.username, '모임원') asc;
end;
$$;

grant execute on function public.get_dashboard_group_member_signals(uuid, integer) to authenticated;
