-- Group join request with password verification
-- 2026-02-16

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
    raise exception '濡쒓렇?몄씠 ?꾩슂?⑸땲??'
      using errcode = 'P0001';
  end if;

  select g.password, coalesce(g.is_closed, false)
    into v_group_password, v_is_closed
  from public.groups g
  where g.id = p_group_id;

  if v_group_password is null and not exists (
    select 1 from public.groups g where g.id = p_group_id
  ) then
    raise exception '議댁옱?섏? ?딅뒗 紐⑥엫?낅땲??'
      using errcode = 'P0001';
  end if;

  if v_is_closed then
    raise exception '?먯뇙??紐⑥엫?낅땲??'
      using errcode = 'P0001';
  end if;

  if public.is_group_member(p_group_id) then
    raise exception '?대? 紐⑥엫 硫ㅻ쾭?낅땲??'
      using errcode = 'P0001';
  end if;

  if coalesce(v_group_password, '') <> coalesce(p_join_password, '') then
    raise exception '媛??鍮꾨?踰덊샇媛 ?쇱튂?섏? ?딆뒿?덈떎.'
      using errcode = 'P0001';
  end if;

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
