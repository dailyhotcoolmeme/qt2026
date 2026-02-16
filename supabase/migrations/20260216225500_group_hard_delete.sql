-- Hard delete group and all related data
-- 2026-02-16

create or replace function public.delete_group_hard(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select owner_id
    into v_owner_id
  from public.groups
  where id = p_group_id;

  if v_owner_id is null then
    raise exception '존재하지 않는 모임입니다.';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception '모임 생성자만 삭제할 수 있습니다.';
  end if;

  delete from public.activity_group_links
  where group_id = p_group_id;

  delete from public.group_faith_records
  where group_id = p_group_id;

  delete from public.group_faith_items
  where group_id = p_group_id;

  delete from public.group_prayer_records
  where group_id = p_group_id;

  delete from public.group_prayer_topics
  where group_id = p_group_id;

  delete from public.group_post_images gpi
  using public.group_posts gp
  where gpi.post_id = gp.id
    and gp.group_id = p_group_id;

  delete from public.group_posts
  where group_id = p_group_id;

  delete from public.group_join_requests
  where group_id = p_group_id;

  delete from public.group_scope_leaders
  where root_group_id = p_group_id;

  delete from public.group_edges
  where parent_group_id = p_group_id
     or child_group_id = p_group_id;

  delete from public.group_members
  where group_id = p_group_id;

  delete from public.groups
  where id = p_group_id;
end;
$$;

grant execute on function public.delete_group_hard(uuid) to authenticated;
