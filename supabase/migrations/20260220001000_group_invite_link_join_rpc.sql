-- Join a group directly from invite link after sign-up/login.
-- 2026-02-20

create or replace function public.join_group_by_invite_link(
  p_group_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_owner_id uuid;
  v_is_closed boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'login required';
  end if;

  select g.owner_id, coalesce(g.is_closed, false)
    into v_owner_id, v_is_closed
  from public.groups g
  where g.id = p_group_id;

  if v_owner_id is null and not exists (select 1 from public.groups g where g.id = p_group_id) then
    raise exception 'group not found';
  end if;

  if v_is_closed then
    raise exception 'group is closed';
  end if;

  if v_owner_id = v_user_id then
    return p_group_id;
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (p_group_id, v_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  delete from public.group_join_requests
  where group_id = p_group_id
    and user_id = v_user_id
    and status = 'approved';

  update public.group_join_requests
  set status = 'approved',
      resolved_at = now(),
      resolved_by = v_user_id
  where group_id = p_group_id
    and user_id = v_user_id
    and status = 'pending';

  return p_group_id;
end;
$$;

grant execute on function public.join_group_by_invite_link(uuid) to authenticated;
