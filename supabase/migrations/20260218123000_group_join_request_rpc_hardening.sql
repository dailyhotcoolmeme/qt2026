-- Harden join-request approval RPC to single-path execution.
-- 2026-02-18

-- 1) Ensure ON CONFLICT(group_id, user_id) has a concrete non-partial unique index.
--    The previous partial unique index can fail index inference in some environments.
delete from public.group_members gm
using public.group_members dup
where gm.group_id = dup.group_id
  and gm.user_id = dup.user_id
  and gm.ctid < dup.ctid
  and gm.group_id is not null
  and gm.user_id is not null;

drop index if exists public.group_members_group_user_uidx;
create unique index if not exists group_members_group_user_uidx
  on public.group_members(group_id, user_id);

-- 2) Recreate RPC with canonical signature order used by PostgREST cache hints.
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
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select group_id, user_id
    into v_group_id, v_user_id
  from public.group_join_requests
  where id = p_request_id
    and status = 'pending'
  for update;

  if v_group_id is null or v_user_id is null then
    raise exception '유효한 가입 신청을 찾지 못했습니다.';
  end if;

  if not public.is_group_manager(v_group_id) then
    raise exception '승인/거절 권한이 없습니다.';
  end if;

  if p_approve then
    insert into public.group_members (group_id, user_id, role)
    values (v_group_id, v_user_id, 'member')
    on conflict (group_id, user_id) do nothing;
  end if;

  update public.group_join_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      resolved_at = now(),
      resolved_by = auth.uid()
  where id = p_request_id;
end;
$$;

grant execute on function public.resolve_group_join_request(boolean, uuid) to authenticated;
