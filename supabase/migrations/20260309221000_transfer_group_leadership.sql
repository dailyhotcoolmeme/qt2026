create or replace function public.transfer_group_leadership(
  p_group_id uuid,
  p_new_leader_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_group_name text;
  v_old_leader_id uuid;
  v_actor_name text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'login required';
  end if;

  select g.owner_id, coalesce(g.name, '모임')
    into v_old_leader_id, v_group_name
  from public.groups g
  where g.id = p_group_id
  for update;

  if v_old_leader_id is null then
    raise exception 'group not found';
  end if;

  if v_old_leader_id <> v_actor_id then
    raise exception 'permission denied';
  end if;

  if p_new_leader_user_id is null or p_new_leader_user_id = v_old_leader_id then
    raise exception 'invalid target leader';
  end if;

  if not exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_new_leader_user_id
  ) then
    raise exception 'target member not found';
  end if;

  update public.group_members
  set role = 'member'
  where group_id = p_group_id
    and user_id = v_old_leader_id;

  update public.group_members
  set role = 'leader'
  where group_id = p_group_id
    and user_id = p_new_leader_user_id;

  update public.groups
  set owner_id = p_new_leader_user_id
  where id = p_group_id;

  select coalesce(nullif(trim(p.nickname), ''), nullif(trim(p.username), ''), '리더')
    into v_actor_name
  from public.profiles p
  where p.id = v_actor_id;

  insert into public.app_notifications (
    user_id,
    notification_type,
    title,
    message,
    target_path,
    event_key,
    payload
  )
  values (
    p_new_leader_user_id,
    'system',
    v_group_name || ' 리더권한 양도',
    coalesce(v_actor_name, '리더') || '님이 리더권한을 양도했습니다.',
    '/group/' || p_group_id::text || '?tab=members',
    'leader_transfer:' || p_group_id::text || ':' || p_new_leader_user_id::text || ':' || extract(epoch from now())::bigint::text,
    jsonb_build_object(
      'type', 'leader_transferred',
      'groupId', p_group_id::text,
      'newLeaderUserId', p_new_leader_user_id::text
    )
  )
  on conflict (user_id, event_key) do nothing;
end;
$$;

grant execute on function public.transfer_group_leadership(uuid, uuid) to authenticated;
