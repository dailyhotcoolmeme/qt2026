-- Approve/reject join request via security definer RPC
-- 2026-02-17

create or replace function public.resolve_group_join_request(
  p_request_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select group_id, user_id
    into v_group_id, v_user_id
  from public.group_join_requests
  where id = p_request_id
    and status = 'pending';

  if v_group_id is null or v_user_id is null then
    raise exception '유효한 가입 요청을 찾지 못했습니다.';
  end if;

  if not public.is_group_manager(v_group_id) then
    raise exception '승인/거절 권한이 없습니다.';
  end if;

  if p_approve then
    insert into public.group_members (group_id, user_id, role)
    values (v_group_id, v_user_id, 'member')
    on conflict (group_id, user_id) do update
      set role = excluded.role;
  end if;

  update public.group_join_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      resolved_at = now(),
      resolved_by = auth.uid()
  where id = p_request_id;
end;
$$;

grant execute on function public.resolve_group_join_request(uuid, boolean) to authenticated;
