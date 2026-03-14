create table if not exists public.group_prayer_topic_attachments (
  id bigserial primary key,
  topic_id bigint not null references public.group_prayer_topics(id) on delete cascade,
  uploader_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null,
  file_name text,
  content_type text,
  attachment_kind text not null check (attachment_kind in ('image', 'file')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists group_prayer_topic_attachments_topic_idx
  on public.group_prayer_topic_attachments(topic_id, sort_order, id);

insert into public.group_prayer_topic_attachments (
  topic_id,
  uploader_id,
  file_url,
  file_name,
  content_type,
  attachment_kind,
  sort_order
)
select
  id,
  author_id,
  attachment_url,
  attachment_name,
  attachment_type,
  case
    when coalesce(attachment_kind, '') in ('image', 'file') then attachment_kind
    when coalesce(attachment_type, '') like 'image/%' then 'image'
    else 'file'
  end,
  0
from public.group_prayer_topics
where attachment_url is not null
  and not exists (
    select 1
    from public.group_prayer_topic_attachments a
    where a.topic_id = group_prayer_topics.id
      and a.file_url = group_prayer_topics.attachment_url
  );

alter table public.group_prayer_topic_attachments enable row level security;

drop policy if exists group_prayer_topic_attachments_select_policy on public.group_prayer_topic_attachments;
create policy group_prayer_topic_attachments_select_policy on public.group_prayer_topic_attachments
for select using (
  exists (
    select 1
    from public.group_prayer_topics t
    where t.id = group_prayer_topic_attachments.topic_id
      and (public.is_group_member(t.group_id) or public.is_scope_leader_for_group(t.group_id))
  )
);

drop policy if exists group_prayer_topic_attachments_insert_policy on public.group_prayer_topic_attachments;
create policy group_prayer_topic_attachments_insert_policy on public.group_prayer_topic_attachments
for insert with check (
  uploader_id = auth.uid()
  and exists (
    select 1
    from public.group_prayer_topics t
    where t.id = group_prayer_topic_attachments.topic_id
      and t.author_id = auth.uid()
  )
);

drop policy if exists group_prayer_topic_attachments_delete_policy on public.group_prayer_topic_attachments;
create policy group_prayer_topic_attachments_delete_policy on public.group_prayer_topic_attachments
for delete using (
  exists (
    select 1
    from public.group_prayer_topics t
    where t.id = group_prayer_topic_attachments.topic_id
      and (t.author_id = auth.uid() or public.is_group_manager(t.group_id))
  )
);
