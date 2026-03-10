drop policy if exists group_faith_records_insert_policy on public.group_faith_records;

create policy group_faith_records_insert_policy on public.group_faith_records
for insert with check (
  (
    user_id = auth.uid()
    and public.is_group_member(group_id)
  )
  or public.is_group_manager(group_id)
);
