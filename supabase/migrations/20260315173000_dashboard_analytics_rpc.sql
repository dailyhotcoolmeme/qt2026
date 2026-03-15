create or replace function public.get_dashboard_access_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_managed_ids uuid[] := '{}'::uuid[];
  v_scope_root_ids uuid[] := '{}'::uuid[];
  v_scope_ids uuid[] := '{}'::uuid[];
  v_joined_ids uuid[] := '{}'::uuid[];
  v_role text := 'member';
begin
  if v_user_id is null then
    raise exception 'login required';
  end if;

  select coalesce(array_agg(distinct q.group_id), '{}'::uuid[])
    into v_managed_ids
  from (
    select g.id as group_id
    from public.groups g
    where g.owner_id = v_user_id
    union
    select gm.group_id
    from public.group_members gm
    where gm.user_id = v_user_id
      and gm.role in ('leader', 'owner')
  ) q;

  select coalesce(array_agg(distinct gsl.root_group_id), '{}'::uuid[])
    into v_scope_root_ids
  from public.group_scope_leaders gsl
  where gsl.user_id = v_user_id;

  select coalesce(array_agg(distinct s.group_id), '{}'::uuid[])
    into v_scope_ids
  from public.get_scope_groups(v_user_id) s;

  select coalesce(array_agg(distinct q.group_id), '{}'::uuid[])
    into v_joined_ids
  from (
    select g.id as group_id
    from public.groups g
    where g.owner_id = v_user_id
    union
    select gm.group_id
    from public.group_members gm
    where gm.user_id = v_user_id
  ) q;

  if coalesce(array_length(v_scope_root_ids, 1), 0) > 0 then
    v_role := 'scope_leader';
  elsif coalesce(array_length(v_managed_ids, 1), 0) > 0 then
    v_role := 'leader';
  else
    v_role := 'member';
  end if;

  return jsonb_build_object(
    'role', v_role,
    'managed_group_ids', to_jsonb(v_managed_ids),
    'managed_group_count', coalesce(array_length(v_managed_ids, 1), 0),
    'scope_root_group_ids', to_jsonb(v_scope_root_ids),
    'scope_root_group_count', coalesce(array_length(v_scope_root_ids, 1), 0),
    'scope_group_ids', to_jsonb(v_scope_ids),
    'scope_group_count', coalesce(array_length(v_scope_ids, 1), 0),
    'joined_group_ids', to_jsonb(v_joined_ids),
    'joined_group_count', coalesce(array_length(v_joined_ids, 1), 0)
  );
end;
$$;

grant execute on function public.get_dashboard_access_profile() to authenticated;

create or replace function public.get_dashboard_group_kpis(
  p_days integer default 28,
  p_scope text default 'managed'
)
returns table(
  group_id uuid,
  group_name text,
  depth integer,
  member_count integer,
  pending_requests integer,
  prayer_records integer,
  faith_records integer,
  post_count integer,
  linked_activities integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_days integer := greatest(coalesce(p_days, 28), 1);
  v_scope text := coalesce(p_scope, 'managed');
begin
  if v_user_id is null then
    raise exception 'login required';
  end if;

  if v_scope not in ('managed', 'scope') then
    raise exception 'invalid scope';
  end if;

  return query
  with accessible as (
    select distinct g.id as group_id, g.name as group_name, 0 as depth
    from public.groups g
    where v_scope = 'managed'
      and g.owner_id = v_user_id

    union

    select distinct g.id as group_id, g.name as group_name, 0 as depth
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where v_scope = 'managed'
      and gm.user_id = v_user_id
      and gm.role in ('leader', 'owner')

    union

    select distinct g.id as group_id, g.name as group_name, s.depth
    from public.get_scope_groups(v_user_id) s
    join public.groups g on g.id = s.group_id
    where v_scope = 'scope'
  ),
  member_stats as (
    select gm.group_id, count(*)::int as member_count
    from public.group_members gm
    join accessible a on a.group_id = gm.group_id
    group by gm.group_id
  ),
  pending_stats as (
    select gjr.group_id, count(*)::int as pending_requests
    from public.group_join_requests gjr
    join accessible a on a.group_id = gjr.group_id
    where gjr.status = 'pending'
    group by gjr.group_id
  ),
  prayer_stats as (
    select gpr.group_id, count(*)::int as prayer_records
    from public.group_prayer_records gpr
    join accessible a on a.group_id = gpr.group_id
    where gpr.created_at >= now() - make_interval(days => v_days)
    group by gpr.group_id
  ),
  faith_stats as (
    select gfr.group_id, count(*)::int as faith_records
    from public.group_faith_records gfr
    join accessible a on a.group_id = gfr.group_id
    where gfr.record_date >= current_date - greatest(v_days - 1, 0)
    group by gfr.group_id
  ),
  post_stats as (
    select gp.group_id, count(*)::int as post_count
    from public.group_posts gp
    join accessible a on a.group_id = gp.group_id
    where gp.created_at >= now() - make_interval(days => v_days)
    group by gp.group_id
  ),
  link_stats as (
    select agl.group_id, count(*)::int as linked_activities
    from public.activity_group_links agl
    join public.activity_logs al on al.id = agl.activity_log_id
    join accessible a on a.group_id = agl.group_id
    where al.occurred_at >= now() - make_interval(days => v_days)
    group by agl.group_id
  )
  select
    a.group_id,
    a.group_name,
    a.depth,
    coalesce(ms.member_count, 0) as member_count,
    coalesce(ps.pending_requests, 0) as pending_requests,
    coalesce(prs.prayer_records, 0) as prayer_records,
    coalesce(fs.faith_records, 0) as faith_records,
    coalesce(pos.post_count, 0) as post_count,
    coalesce(ls.linked_activities, 0) as linked_activities
  from accessible a
  left join member_stats ms on ms.group_id = a.group_id
  left join pending_stats ps on ps.group_id = a.group_id
  left join prayer_stats prs on prs.group_id = a.group_id
  left join faith_stats fs on fs.group_id = a.group_id
  left join post_stats pos on pos.group_id = a.group_id
  left join link_stats ls on ls.group_id = a.group_id
  order by a.depth asc, a.group_name asc;
end;
$$;

grant execute on function public.get_dashboard_group_kpis(integer, text) to authenticated;

create or replace function public.get_dashboard_group_timeline(
  p_days integer default 28,
  p_scope text default 'managed'
)
returns table(
  bucket_date date,
  prayer_records integer,
  faith_records integer,
  post_count integer,
  linked_activities integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_days integer := greatest(coalesce(p_days, 28), 1);
  v_scope text := coalesce(p_scope, 'managed');
begin
  if v_user_id is null then
    raise exception 'login required';
  end if;

  if v_scope not in ('managed', 'scope') then
    raise exception 'invalid scope';
  end if;

  return query
  with accessible as (
    select distinct g.id as group_id
    from public.groups g
    where v_scope = 'managed'
      and g.owner_id = v_user_id

    union

    select distinct gm.group_id
    from public.group_members gm
    where v_scope = 'managed'
      and gm.user_id = v_user_id
      and gm.role in ('leader', 'owner')

    union

    select distinct s.group_id
    from public.get_scope_groups(v_user_id) s
    where v_scope = 'scope'
  ),
  calendar as (
    select generate_series(
      current_date - greatest(v_days - 1, 0),
      current_date,
      interval '1 day'
    )::date as bucket_date
  ),
  prayer_series as (
    select (gpr.created_at at time zone 'Asia/Seoul')::date as bucket_date, count(*)::int as prayer_records
    from public.group_prayer_records gpr
    join accessible a on a.group_id = gpr.group_id
    where gpr.created_at >= now() - make_interval(days => v_days)
    group by 1
  ),
  faith_series as (
    select gfr.record_date as bucket_date, count(*)::int as faith_records
    from public.group_faith_records gfr
    join accessible a on a.group_id = gfr.group_id
    where gfr.record_date >= current_date - greatest(v_days - 1, 0)
    group by 1
  ),
  post_series as (
    select (gp.created_at at time zone 'Asia/Seoul')::date as bucket_date, count(*)::int as post_count
    from public.group_posts gp
    join accessible a on a.group_id = gp.group_id
    where gp.created_at >= now() - make_interval(days => v_days)
    group by 1
  ),
  link_series as (
    select (al.occurred_at at time zone 'Asia/Seoul')::date as bucket_date, count(*)::int as linked_activities
    from public.activity_group_links agl
    join public.activity_logs al on al.id = agl.activity_log_id
    join accessible a on a.group_id = agl.group_id
    where al.occurred_at >= now() - make_interval(days => v_days)
    group by 1
  )
  select
    c.bucket_date,
    coalesce(ps.prayer_records, 0) as prayer_records,
    coalesce(fs.faith_records, 0) as faith_records,
    coalesce(pos.post_count, 0) as post_count,
    coalesce(ls.linked_activities, 0) as linked_activities
  from calendar c
  left join prayer_series ps on ps.bucket_date = c.bucket_date
  left join faith_series fs on fs.bucket_date = c.bucket_date
  left join post_series pos on pos.bucket_date = c.bucket_date
  left join link_series ls on ls.bucket_date = c.bucket_date
  order by c.bucket_date asc;
end;
$$;

grant execute on function public.get_dashboard_group_timeline(integer, text) to authenticated;
