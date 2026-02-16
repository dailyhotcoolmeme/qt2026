-- Group dashboard extension + archive qt fix
-- 2026-02-16

alter table public.groups
  add column if not exists header_image_url text,
  add column if not exists header_color text default '#4A6741',
  add column if not exists is_closed boolean not null default false,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references auth.users(id);

create table if not exists public.group_prayer_topics (
  id bigserial primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists group_prayer_topics_group_created_idx
  on public.group_prayer_topics(group_id, created_at desc);

alter table public.group_posts
  add column if not exists title text;

update public.group_posts
set title = coalesce(nullif(trim(left(content, 50)), ''), '제목 없음')
where title is null;

create or replace function public.trg_user_meditation_records_activity()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is not null then
    perform public.upsert_activity_log(
      new.user_id,
      'qt',
      'personal',
      null,
      'user_meditation_records',
      new.id::text,
      jsonb_build_object(
        'target_date', new.date,
        'meditation_excerpt', left(coalesce(new.meditation_text, ''), 120),
        'meditation_type', coalesce(new.meditation_type, 'text'),
        'audio_duration', coalesce(new.audio_duration, 0),
        'book_name', new.book_name,
        'chapter', new.chapter,
        'verse', new.verse
      ),
      coalesce(new.updated_at, new.created_at, now())
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_meditation_records_activity on public.user_meditation_records;
create trigger trg_user_meditation_records_activity
after insert or update on public.user_meditation_records
for each row execute function public.trg_user_meditation_records_activity();

insert into public.activity_logs(
  user_id, activity_type, source_kind, source_group_id, source_table, source_row_id, payload, occurred_at
)
select
  umr.user_id,
  'qt',
  'personal',
  null,
  'user_meditation_records',
  umr.id::text,
  jsonb_build_object(
    'target_date', umr.date,
    'meditation_excerpt', left(coalesce(umr.meditation_text, ''), 120),
    'meditation_type', coalesce(umr.meditation_type, 'text'),
    'audio_duration', coalesce(umr.audio_duration, 0),
    'book_name', umr.book_name,
    'chapter', umr.chapter,
    'verse', umr.verse
  ),
  coalesce(umr.updated_at, umr.created_at, now())
from public.user_meditation_records umr
where umr.user_id is not null
  and not exists (
    select 1 from public.activity_logs al
    where al.user_id = umr.user_id
      and al.activity_type = 'qt'
      and al.source_kind = 'personal'
      and al.source_table = 'user_meditation_records'
      and al.source_row_id = umr.id::text
  );

alter table public.group_prayer_topics enable row level security;

drop policy if exists group_prayer_topics_select_policy on public.group_prayer_topics;
create policy group_prayer_topics_select_policy on public.group_prayer_topics
for select using (
  public.is_group_member(group_id)
  or public.is_scope_leader_for_group(group_id)
);

drop policy if exists group_prayer_topics_insert_policy on public.group_prayer_topics;
create policy group_prayer_topics_insert_policy on public.group_prayer_topics
for insert with check (
  author_id = auth.uid()
  and public.is_group_member(group_id)
);

drop policy if exists group_prayer_topics_update_policy on public.group_prayer_topics;
create policy group_prayer_topics_update_policy on public.group_prayer_topics
for update using (
  author_id = auth.uid() or public.is_group_manager(group_id)
)
with check (
  author_id = auth.uid() or public.is_group_manager(group_id)
);

drop policy if exists group_prayer_topics_delete_policy on public.group_prayer_topics;
create policy group_prayer_topics_delete_policy on public.group_prayer_topics
for delete using (
  author_id = auth.uid() or public.is_group_manager(group_id)
);

drop policy if exists group_join_requests_insert_policy on public.group_join_requests;
create policy group_join_requests_insert_policy on public.group_join_requests
for insert with check (
  user_id = auth.uid()
  and not public.is_group_member(group_id)
  and exists (
    select 1
    from public.groups g
    where g.id = group_join_requests.group_id
      and coalesce(g.is_closed, false) = false
  )
);
