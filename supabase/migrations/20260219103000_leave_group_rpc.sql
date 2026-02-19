-- Add leave_group RPC for reliable member exit under RLS.
-- 2026-02-19

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
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select owner_id into v_owner_id
  from public.groups
  where id = p_group_id;

  if v_owner_id is null then
    raise exception '모임을 찾지 못했습니다.';
  end if;

  if v_owner_id = v_user_id then
    raise exception '관리자는 모임을 나갈 수 없습니다.';
  end if;

  delete from public.group_members
  where group_id = p_group_id
    and user_id = v_user_id;

  if not found then
    raise exception '모임 멤버 정보가 없습니다.';
  end if;

  update public.group_join_requests
  set status = 'rejected',
      resolved_at = now(),
      resolved_by = v_user_id
  where group_id = p_group_id
    and user_id = v_user_id
    and status = 'pending';
end;
$$;

grant execute on function public.leave_group(uuid) to authenticated;
