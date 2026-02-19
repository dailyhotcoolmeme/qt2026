-- Update member role via RPC and notify target member.
-- 2026-02-19

create or replace function public.update_group_member_role(
  p_group_id uuid,
  p_target_user_id uuid,
  p_next_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_owner_id uuid;
  v_group_name text;
  v_actor_name text;
  v_changed_count integer;
  v_event_key text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'login required';
  end if;

  if p_next_role not in ('leader', 'member') then
    raise exception 'invalid role';
  end if;

  select g.owner_id, coalesce(g.name, '모임')
    into v_owner_id, v_group_name
  from public.groups g
  where g.id = p_group_id;

  if v_owner_id is null then
    raise exception 'group not found';
  end if;

  if not public.is_group_manager_safe(p_group_id) then
    raise exception 'permission denied';
  end if;

  if v_owner_id = p_target_user_id then
    raise exception 'owner role cannot be changed';
  end if;

  update public.group_members gm
  set role = p_next_role
  where gm.group_id = p_group_id
    and gm.user_id = p_target_user_id;

  get diagnostics v_changed_count = row_count;
  if v_changed_count = 0 then
    raise exception 'member not found';
  end if;

  select coalesce(nullif(trim(p.nickname), ''), nullif(trim(p.username), ''), '관리자')
    into v_actor_name
  from public.profiles p
  where p.id = v_actor_id;
  v_actor_name := coalesce(v_actor_name, '관리자');

  v_event_key := 'member_role:' || p_group_id::text || ':' || p_target_user_id::text || ':' || p_next_role || ':' || extract(epoch from now())::bigint::text;

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
    p_target_user_id,
    'system',
    v_group_name || ' 멤버 권한 변경',
    v_actor_name || '님이 회원 유형을 ' || case when p_next_role = 'leader' then '리더' else '일반멤버' end || '로 변경했습니다.',
    '/group/' || p_group_id::text || '?tab=members',
    v_event_key,
    jsonb_build_object(
      'type', 'member_role_changed',
      'groupId', p_group_id::text,
      'targetUserId', p_target_user_id::text,
      'role', p_next_role
    )
  )
  on conflict (user_id, event_key) do nothing;
end;
$$;

grant execute on function public.update_group_member_role(uuid, uuid, text) to authenticated;

