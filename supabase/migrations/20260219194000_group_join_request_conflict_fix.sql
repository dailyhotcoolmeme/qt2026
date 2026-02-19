-- Fix join-request conflict when approving/rejecting repeatedly.
-- 2026-02-19

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
  v_is_closed boolean;
  v_request_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'login required' using errcode = 'P0001';
  end if;

  select g.password, coalesce(g.is_closed, false)
    into v_group_password, v_is_closed
  from public.groups g
  where g.id = p_group_id;

  if v_group_password is null and not exists (
    select 1 from public.groups g where g.id = p_group_id
  ) then
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

  -- Remove old resolved requests so pending->approved/rejected cannot conflict later.
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

  return v_request_id;
end;
$$;

grant execute on function public.create_group_join_request_with_password(uuid, text, text) to authenticated;

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
  v_user_id uuid;
  v_target_status text;
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;

  select group_id, user_id
    into v_group_id, v_user_id
  from public.group_join_requests
  where id = p_request_id
    and status = 'pending'
  for update;

  if v_group_id is null or v_user_id is null then
    raise exception 'pending request not found';
  end if;

  if not public.is_group_manager(v_group_id) then
    raise exception 'permission denied';
  end if;

  v_target_status := case when p_approve then 'approved' else 'rejected' end;

  -- Remove same-status historical row to avoid unique(group_id,user_id,status) conflict.
  delete from public.group_join_requests
  where group_id = v_group_id
    and user_id = v_user_id
    and status = v_target_status
    and id <> p_request_id;

  if p_approve then
    insert into public.group_members (group_id, user_id, role)
    values (v_group_id, v_user_id, 'member')
    on conflict (group_id, user_id) do nothing;
  end if;

  update public.group_join_requests
  set status = v_target_status,
      resolved_at = now(),
      resolved_by = auth.uid()
  where id = p_request_id;
end;
$$;

grant execute on function public.resolve_group_join_request(boolean, uuid) to authenticated;
