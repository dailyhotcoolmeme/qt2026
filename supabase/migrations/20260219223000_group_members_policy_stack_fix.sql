-- Fix recursive RLS evaluation on group_members causing stack depth errors.
-- 2026-02-19

create or replace function public.is_group_manager_safe(
  p_group_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return false;
  end if;

  if exists (
    select 1
    from public.groups g
    where g.id = p_group_id
      and g.owner_id = v_uid
  ) then
    return true;
  end if;

  if exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = v_uid
      and gm.role in ('leader', 'owner')
  ) then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.is_group_manager_safe(uuid) to authenticated;

drop policy if exists group_members_select_policy on public.group_members;
drop policy if exists group_members_insert_policy on public.group_members;
drop policy if exists group_members_update_policy on public.group_members;
drop policy if exists group_members_delete_policy on public.group_members;

create policy group_members_select_policy on public.group_members
for select
using (
  user_id = auth.uid()
  or public.is_group_manager_safe(group_id)
  or public.is_scope_leader_for_group(group_id)
);

create policy group_members_insert_policy on public.group_members
for insert
with check (public.is_group_manager_safe(group_id));

create policy group_members_update_policy on public.group_members
for update
using (public.is_group_manager_safe(group_id))
with check (public.is_group_manager_safe(group_id));

create policy group_members_delete_policy on public.group_members
for delete
using (public.is_group_manager_safe(group_id) or user_id = auth.uid());

