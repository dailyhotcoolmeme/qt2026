-- Add group type column for community create modal
-- 2026-02-17

alter table public.groups
  add column if not exists group_type text default 'etc';

alter table public.groups
  drop constraint if exists groups_group_type_check;

alter table public.groups
  add constraint groups_group_type_check
  check (group_type in ('church', 'work_school', 'family', 'etc'));
