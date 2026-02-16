-- Group + Activity foundation
-- 2026-02-16

create extension if not exists pgcrypto;

-- ----------------------------------------
-- Existing group baseline hardening
-- ----------------------------------------
create unique index if not exists group_members_group_user_uidx
  on public.group_members (group_id, user_id)
  where group_id is not null and user_id is not null;

insert into public.group_members (group_id, user_id, role)
select g.id, g.owner_id, 'leader'
from public.groups g
where g.owner_id is not null
  and not exists (
    select 1
    from public.group_members gm
    where gm.group_id = g.id
      and gm.user_id = g.owner_id
  );

create table if not exists public.group_edges (
  parent_group_id uuid not null references public.groups(id) on delete cascade,
  child_group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint group_edges_pkey primary key (parent_group_id, child_group_id),
  constraint group_edges_no_self check (parent_group_id <> child_group_id)
);

create index if not exists group_edges_child_idx on public.group_edges(child_group_id);

create table if not exists public.group_scope_leaders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  root_group_id uuid not null references public.groups(id) on delete cascade,
  can_manage boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, root_group_id)
);

create table if not exists public.group_posts (
  id bigserial primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  post_type text not null default 'post' check (post_type in ('post', 'notice')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists group_posts_group_created_idx
  on public.group_posts(group_id, created_at desc);

create table if not exists public.group_prayer_records (
  id bigserial primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null default 'direct' check (source_type in ('direct', 'linked')),
  source_prayer_record_id integer references public.prayer_records(id) on delete set null,
  audio_url text not null,
  audio_duration integer not null default 0,
  title text,
  created_at timestamptz not null default now()
);

alter table public.group_prayer_records
  add column if not exists source_type text not null default 'direct';

alter table public.group_prayer_records
  add column if not exists source_prayer_record_id integer;

create index if not exists group_prayer_records_group_created_idx
  on public.group_prayer_records(group_id, created_at desc);

create unique index if not exists group_prayer_records_link_unique
  on public.group_prayer_records(group_id, source_prayer_record_id)
  where source_prayer_record_id is not null;

create table if not exists public.group_faith_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  item_type text not null default 'check' check (item_type in ('check', 'count', 'attendance')),
  source_mode text not null default 'manual' check (source_mode in ('manual', 'linked', 'both')),
  linked_feature text not null default 'none' check (linked_feature in ('none', 'qt', 'prayer', 'reading')),
  schedule_rule jsonb not null default '{}'::jsonb,
  is_required boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists group_faith_items_group_sort_idx
  on public.group_faith_items(group_id, sort_order, created_at);

create table if not exists public.group_faith_records (
  id bigserial primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  item_id uuid not null references public.group_faith_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null default current_date,
  value numeric not null default 1,
  note text,
  source_type text not null default 'manual' check (source_type in ('manual', 'linked')),
  source_event_type text,
  source_event_id text,
  created_at timestamptz not null default now(),
  unique(group_id, item_id, user_id, record_date)
);

create index if not exists group_faith_records_group_user_date_idx
  on public.group_faith_records(group_id, user_id, record_date desc);

create table if not exists public.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  unique(group_id, user_id, status)
);

create index if not exists group_join_requests_group_status_idx
  on public.group_join_requests(group_id, status, created_at desc);

-- ----------------------------------------
-- Bookmark + Activity log model
-- ----------------------------------------
create table if not exists public.verse_bookmarks (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('daily_word', 'qt', 'reading', 'custom')),
  verse_ref text not null,
  content text,
  memo text,
  created_at timestamptz not null default now()
);

create unique index if not exists verse_bookmarks_unique_idx
  on public.verse_bookmarks(user_id, source, verse_ref, md5(coalesce(content, '')));

create index if not exists verse_bookmarks_user_created_idx
  on public.verse_bookmarks(user_id, created_at desc);

create table if not exists public.activity_logs (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('qt', 'prayer', 'reading', 'bookmark')),
  source_kind text not null check (source_kind in ('personal', 'group_direct')),
  source_group_id uuid references public.groups(id) on delete set null,
  source_table text not null,
  source_row_id text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_user_type_time_idx
  on public.activity_logs(user_id, activity_type, occurred_at desc);

create table if not exists public.activity_group_links (
  id bigserial primary key,
  activity_log_id bigint not null references public.activity_logs(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  linked_by uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  unique(activity_log_id, group_id)
);

create index if not exists activity_group_links_group_idx
  on public.activity_group_links(group_id, linked_at desc);

-- ----------------------------------------
-- Authorization helpers
-- ----------------------------------------
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.groups g
    where g.id = p_group_id
      and g.owner_id = auth.uid()
  );
$$;

create or replace function public.is_group_manager(p_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = p_group_id
      and g.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.role in ('leader', 'owner')
  );
$$;

create or replace function public.get_scope_groups(p_user_id uuid)
returns table(group_id uuid, depth integer)
language sql
stable
as $$
  with recursive roots as (
    select gsl.root_group_id as group_id
    from public.group_scope_leaders gsl
    where gsl.user_id = p_user_id
  ), walk as (
    select r.group_id, 0 as depth
    from roots r
    union all
    select ge.child_group_id, w.depth + 1
    from walk w
    join public.group_edges ge
      on ge.parent_group_id = w.group_id
  )
  select group_id, min(depth) as depth
  from walk
  group by group_id;
$$;

create or replace function public.is_scope_leader_for_group(p_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.get_scope_groups(auth.uid()) s
    where s.group_id = p_group_id
  );
$$;

create or replace function public.upsert_activity_log(
  p_user_id uuid,
  p_activity_type text,
  p_source_kind text,
  p_source_group_id uuid,
  p_source_table text,
  p_source_row_id text,
  p_payload jsonb,
  p_occurred_at timestamptz
)
returns bigint
language plpgsql
as $$
declare
  v_id bigint;
begin
  select al.id
    into v_id
  from public.activity_logs al
  where al.user_id = p_user_id
    and al.activity_type = p_activity_type
    and al.source_kind = p_source_kind
    and al.source_table = p_source_table
    and al.source_row_id = p_source_row_id
    and ((al.source_group_id is null and p_source_group_id is null) or al.source_group_id = p_source_group_id)
  order by al.id desc
  limit 1;

  if v_id is null then
    insert into public.activity_logs(
      user_id,
      activity_type,
      source_kind,
      source_group_id,
      source_table,
      source_row_id,
      payload,
      occurred_at
    )
    values (
      p_user_id,
      p_activity_type,
      p_source_kind,
      p_source_group_id,
      p_source_table,
      p_source_row_id,
      coalesce(p_payload, '{}'::jsonb),
      coalesce(p_occurred_at, now())
    )
    returning id into v_id;
  else
    update public.activity_logs
    set payload = coalesce(activity_logs.payload, '{}'::jsonb) || coalesce(p_payload, '{}'::jsonb),
        occurred_at = coalesce(p_occurred_at, activity_logs.occurred_at)
    where id = v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.link_personal_activity_to_group(
  p_user_id uuid,
  p_activity_type text,
  p_source_table text,
  p_source_row_id text,
  p_group_id uuid,
  p_linked_by uuid
)
returns bigint
language plpgsql
as $$
declare
  v_activity_id bigint;
begin
  select al.id
    into v_activity_id
  from public.activity_logs al
  where al.user_id = p_user_id
    and al.activity_type = p_activity_type
    and al.source_kind = 'personal'
    and al.source_table = p_source_table
    and al.source_row_id = p_source_row_id
  order by al.id desc
  limit 1;

  if v_activity_id is null then
    v_activity_id := public.upsert_activity_log(
      p_user_id,
      p_activity_type,
      'personal',
      null,
      p_source_table,
      p_source_row_id,
      '{}'::jsonb,
      now()
    );
  end if;

  insert into public.activity_group_links(activity_log_id, group_id, linked_by)
  values (v_activity_id, p_group_id, p_linked_by)
  on conflict (activity_log_id, group_id) do nothing;

  return v_activity_id;
end;
$$;

-- ----------------------------------------
-- Triggers: auto log from existing domain tables
-- ----------------------------------------
create or replace function public.trg_prayer_records_activity()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is not null then
    perform public.upsert_activity_log(
      new.user_id,
      'prayer',
      'personal',
      null,
      'prayer_records',
      new.id::text,
      jsonb_build_object(
        'title', coalesce(new.title, '기도 기록'),
        'audio_url', new.audio_url,
        'audio_duration', coalesce(new.audio_duration, 0),
        'date', new.date
      ),
      coalesce(new.created_at, now())
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prayer_records_activity on public.prayer_records;
create trigger trg_prayer_records_activity
after insert on public.prayer_records
for each row execute function public.trg_prayer_records_activity();

create or replace function public.trg_qt_posts_activity()
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
      'qt_posts',
      new.id::text,
      jsonb_build_object(
        'target_date', new.target_date,
        'meditation_excerpt', left(coalesce(new.meditation_content, ''), 120),
        'prayer_excerpt', left(coalesce(new.prayer_content, ''), 120)
      ),
      coalesce(new.created_at, now())
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_qt_posts_activity on public.qt_posts;
create trigger trg_qt_posts_activity
after insert on public.qt_posts
for each row execute function public.trg_qt_posts_activity();

create or replace function public.trg_reading_records_activity()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is not null then
    perform public.upsert_activity_log(
      new.user_id,
      'reading',
      'personal',
      null,
      'user_reading_records',
      new.id::text,
      jsonb_build_object(
        'book_name', new.book_name,
        'chapter', new.chapter,
        'start_verse', new.start_verse,
        'end_verse', new.end_verse,
        'read_count', coalesce(new.read_count, 1),
        'date', new.date
      ),
      coalesce(new.updated_at, new.created_at, now())
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reading_records_activity on public.user_reading_records;
create trigger trg_reading_records_activity
after insert or update on public.user_reading_records
for each row execute function public.trg_reading_records_activity();

create or replace function public.trg_bookmarks_activity()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is not null then
    perform public.upsert_activity_log(
      new.user_id,
      'bookmark',
      'personal',
      null,
      'verse_bookmarks',
      new.id::text,
      jsonb_build_object(
        'source', new.source,
        'verse_ref', new.verse_ref,
        'content', left(coalesce(new.content, ''), 220)
      ),
      coalesce(new.created_at, now())
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bookmarks_activity on public.verse_bookmarks;
create trigger trg_bookmarks_activity
after insert on public.verse_bookmarks
for each row execute function public.trg_bookmarks_activity();

create or replace function public.trg_group_prayer_records_activity()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is not null then
    if coalesce(new.source_type, 'direct') = 'direct' then
      perform public.upsert_activity_log(
        new.user_id,
        'prayer',
        'group_direct',
        new.group_id,
        'group_prayer_records',
        new.id::text,
        jsonb_build_object(
          'title', coalesce(new.title, '모임 기도'),
          'audio_url', new.audio_url,
          'audio_duration', coalesce(new.audio_duration, 0)
        ),
        coalesce(new.created_at, now())
      );
    elsif new.source_prayer_record_id is not null then
      perform public.link_personal_activity_to_group(
        new.user_id,
        'prayer',
        'prayer_records',
        new.source_prayer_record_id::text,
        new.group_id,
        new.user_id
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_group_prayer_records_activity on public.group_prayer_records;
create trigger trg_group_prayer_records_activity
after insert on public.group_prayer_records
for each row execute function public.trg_group_prayer_records_activity();

create or replace function public.trg_group_faith_records_activity()
returns trigger
language plpgsql
as $$
declare
  v_feature text;
  v_activity text;
begin
  select gfi.linked_feature into v_feature
  from public.group_faith_items gfi
  where gfi.id = new.item_id;

  if v_feature in ('qt', 'prayer', 'reading') then
    v_activity := case
      when v_feature = 'qt' then 'qt'
      when v_feature = 'prayer' then 'prayer'
      when v_feature = 'reading' then 'reading'
      else null
    end;

    if v_activity is not null then
      perform public.upsert_activity_log(
        new.user_id,
        v_activity,
        'group_direct',
        new.group_id,
        'group_faith_records',
        new.id::text,
        jsonb_build_object(
          'item_id', new.item_id,
          'value', new.value,
          'record_date', new.record_date
        ),
        coalesce(new.created_at, now())
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_group_faith_records_activity on public.group_faith_records;
create trigger trg_group_faith_records_activity
after insert or update on public.group_faith_records
for each row execute function public.trg_group_faith_records_activity();

-- ----------------------------------------
-- Backfill existing data into activity logs
-- ----------------------------------------
insert into public.activity_logs(
  user_id, activity_type, source_kind, source_group_id, source_table, source_row_id, payload, occurred_at
)
select
  pr.user_id,
  'prayer',
  'personal',
  null,
  'prayer_records',
  pr.id::text,
  jsonb_build_object(
    'title', coalesce(pr.title, '기도 기록'),
    'audio_url', pr.audio_url,
    'audio_duration', coalesce(pr.audio_duration, 0),
    'date', pr.date
  ),
  coalesce(pr.created_at, now())
from public.prayer_records pr
where pr.user_id is not null
  and not exists (
    select 1 from public.activity_logs al
    where al.user_id = pr.user_id
      and al.activity_type = 'prayer'
      and al.source_kind = 'personal'
      and al.source_table = 'prayer_records'
      and al.source_row_id = pr.id::text
  );

insert into public.activity_logs(
  user_id, activity_type, source_kind, source_group_id, source_table, source_row_id, payload, occurred_at
)
select
  qp.user_id,
  'qt',
  'personal',
  null,
  'qt_posts',
  qp.id::text,
  jsonb_build_object(
    'target_date', qp.target_date,
    'meditation_excerpt', left(coalesce(qp.meditation_content, ''), 120),
    'prayer_excerpt', left(coalesce(qp.prayer_content, ''), 120)
  ),
  coalesce(qp.created_at, now())
from public.qt_posts qp
where qp.user_id is not null
  and not exists (
    select 1 from public.activity_logs al
    where al.user_id = qp.user_id
      and al.activity_type = 'qt'
      and al.source_kind = 'personal'
      and al.source_table = 'qt_posts'
      and al.source_row_id = qp.id::text
  );

insert into public.activity_logs(
  user_id, activity_type, source_kind, source_group_id, source_table, source_row_id, payload, occurred_at
)
select
  urr.user_id,
  'reading',
  'personal',
  null,
  'user_reading_records',
  urr.id::text,
  jsonb_build_object(
    'book_name', urr.book_name,
    'chapter', urr.chapter,
    'start_verse', urr.start_verse,
    'end_verse', urr.end_verse,
    'read_count', coalesce(urr.read_count, 1),
    'date', urr.date
  ),
  coalesce(urr.updated_at, urr.created_at, now())
from public.user_reading_records urr
where urr.user_id is not null
  and not exists (
    select 1 from public.activity_logs al
    where al.user_id = urr.user_id
      and al.activity_type = 'reading'
      and al.source_kind = 'personal'
      and al.source_table = 'user_reading_records'
      and al.source_row_id = urr.id::text
  );

insert into public.activity_logs(
  user_id, activity_type, source_kind, source_group_id, source_table, source_row_id, payload, occurred_at
)
select
  gpr.user_id,
  'prayer',
  'group_direct',
  gpr.group_id,
  'group_prayer_records',
  gpr.id::text,
  jsonb_build_object(
    'title', coalesce(gpr.title, '모임 기도'),
    'audio_url', gpr.audio_url,
    'audio_duration', coalesce(gpr.audio_duration, 0)
  ),
  coalesce(gpr.created_at, now())
from public.group_prayer_records gpr
where gpr.user_id is not null
  and coalesce(gpr.source_type, 'direct') = 'direct'
  and not exists (
    select 1 from public.activity_logs al
    where al.user_id = gpr.user_id
      and al.activity_type = 'prayer'
      and al.source_kind = 'group_direct'
      and al.source_group_id = gpr.group_id
      and al.source_table = 'group_prayer_records'
      and al.source_row_id = gpr.id::text
  );

insert into public.activity_group_links(activity_log_id, group_id, linked_by, linked_at)
select
  al.id,
  gpr.group_id,
  gpr.user_id,
  coalesce(gpr.created_at, now())
from public.group_prayer_records gpr
join public.activity_logs al
  on al.user_id = gpr.user_id
 and al.activity_type = 'prayer'
 and al.source_kind = 'personal'
 and al.source_table = 'prayer_records'
 and al.source_row_id = gpr.source_prayer_record_id::text
where gpr.source_prayer_record_id is not null
on conflict (activity_log_id, group_id) do nothing;

-- ----------------------------------------
-- RLS
-- ----------------------------------------
alter table public.group_edges enable row level security;
alter table public.group_scope_leaders enable row level security;
alter table public.group_posts enable row level security;
alter table public.group_prayer_records enable row level security;
alter table public.group_faith_items enable row level security;
alter table public.group_faith_records enable row level security;
alter table public.group_join_requests enable row level security;
alter table public.verse_bookmarks enable row level security;
alter table public.activity_logs enable row level security;
alter table public.activity_group_links enable row level security;

-- group_edges
drop policy if exists group_edges_select_policy on public.group_edges;
create policy group_edges_select_policy on public.group_edges
for select using (
  public.is_group_manager(parent_group_id)
  or public.is_scope_leader_for_group(child_group_id)
);

drop policy if exists group_edges_write_policy on public.group_edges;
create policy group_edges_write_policy on public.group_edges
for all using (public.is_group_manager(parent_group_id))
with check (public.is_group_manager(parent_group_id));

-- group_scope_leaders
drop policy if exists group_scope_leaders_select_policy on public.group_scope_leaders;
create policy group_scope_leaders_select_policy on public.group_scope_leaders
for select using (
  user_id = auth.uid()
  or public.is_group_manager(root_group_id)
);

drop policy if exists group_scope_leaders_write_policy on public.group_scope_leaders;
create policy group_scope_leaders_write_policy on public.group_scope_leaders
for all using (public.is_group_manager(root_group_id))
with check (public.is_group_manager(root_group_id));

-- group_posts
drop policy if exists group_posts_select_policy on public.group_posts;
create policy group_posts_select_policy on public.group_posts
for select using (public.is_group_member(group_id));

drop policy if exists group_posts_insert_policy on public.group_posts;
create policy group_posts_insert_policy on public.group_posts
for insert with check (
  author_id = auth.uid()
  and public.is_group_member(group_id)
  and (post_type = 'post' or public.is_group_manager(group_id))
);

drop policy if exists group_posts_update_policy on public.group_posts;
create policy group_posts_update_policy on public.group_posts
for update using (author_id = auth.uid() or public.is_group_manager(group_id))
with check (author_id = auth.uid() or public.is_group_manager(group_id));

drop policy if exists group_posts_delete_policy on public.group_posts;
create policy group_posts_delete_policy on public.group_posts
for delete using (author_id = auth.uid() or public.is_group_manager(group_id));

-- group_prayer_records
drop policy if exists group_prayer_records_select_policy on public.group_prayer_records;
create policy group_prayer_records_select_policy on public.group_prayer_records
for select using (public.is_group_member(group_id));

drop policy if exists group_prayer_records_insert_policy on public.group_prayer_records;
create policy group_prayer_records_insert_policy on public.group_prayer_records
for insert with check (user_id = auth.uid() and public.is_group_member(group_id));

drop policy if exists group_prayer_records_delete_policy on public.group_prayer_records;
create policy group_prayer_records_delete_policy on public.group_prayer_records
for delete using (user_id = auth.uid() or public.is_group_manager(group_id));

-- group_faith_items
drop policy if exists group_faith_items_select_policy on public.group_faith_items;
create policy group_faith_items_select_policy on public.group_faith_items
for select using (public.is_group_member(group_id) or public.is_scope_leader_for_group(group_id));

drop policy if exists group_faith_items_write_policy on public.group_faith_items;
create policy group_faith_items_write_policy on public.group_faith_items
for all using (public.is_group_manager(group_id))
with check (public.is_group_manager(group_id));

-- group_faith_records
drop policy if exists group_faith_records_select_policy on public.group_faith_records;
create policy group_faith_records_select_policy on public.group_faith_records
for select using (public.is_group_member(group_id) or public.is_scope_leader_for_group(group_id));

drop policy if exists group_faith_records_insert_policy on public.group_faith_records;
create policy group_faith_records_insert_policy on public.group_faith_records
for insert with check (user_id = auth.uid() and public.is_group_member(group_id));

drop policy if exists group_faith_records_update_policy on public.group_faith_records;
create policy group_faith_records_update_policy on public.group_faith_records
for update using (user_id = auth.uid() or public.is_group_manager(group_id))
with check (user_id = auth.uid() or public.is_group_manager(group_id));

drop policy if exists group_faith_records_delete_policy on public.group_faith_records;
create policy group_faith_records_delete_policy on public.group_faith_records
for delete using (user_id = auth.uid() or public.is_group_manager(group_id));

-- group_join_requests
drop policy if exists group_join_requests_select_policy on public.group_join_requests;
create policy group_join_requests_select_policy on public.group_join_requests
for select using (
  user_id = auth.uid()
  or public.is_group_manager(group_id)
);

drop policy if exists group_join_requests_insert_policy on public.group_join_requests;
create policy group_join_requests_insert_policy on public.group_join_requests
for insert with check (
  user_id = auth.uid()
  and not public.is_group_member(group_id)
);

drop policy if exists group_join_requests_update_policy on public.group_join_requests;
create policy group_join_requests_update_policy on public.group_join_requests
for update using (public.is_group_manager(group_id))
with check (public.is_group_manager(group_id));

-- verse_bookmarks
drop policy if exists verse_bookmarks_select_policy on public.verse_bookmarks;
create policy verse_bookmarks_select_policy on public.verse_bookmarks
for select using (user_id = auth.uid());

drop policy if exists verse_bookmarks_insert_policy on public.verse_bookmarks;
create policy verse_bookmarks_insert_policy on public.verse_bookmarks
for insert with check (user_id = auth.uid());

drop policy if exists verse_bookmarks_update_policy on public.verse_bookmarks;
create policy verse_bookmarks_update_policy on public.verse_bookmarks
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists verse_bookmarks_delete_policy on public.verse_bookmarks;
create policy verse_bookmarks_delete_policy on public.verse_bookmarks
for delete using (user_id = auth.uid());

-- activity_logs
drop policy if exists activity_logs_select_policy on public.activity_logs;
create policy activity_logs_select_policy on public.activity_logs
for select using (user_id = auth.uid());

drop policy if exists activity_logs_insert_policy on public.activity_logs;
create policy activity_logs_insert_policy on public.activity_logs
for insert with check (user_id = auth.uid());

drop policy if exists activity_logs_update_policy on public.activity_logs;
create policy activity_logs_update_policy on public.activity_logs
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists activity_logs_delete_policy on public.activity_logs;
create policy activity_logs_delete_policy on public.activity_logs
for delete using (user_id = auth.uid());

-- activity_group_links
drop policy if exists activity_group_links_select_policy on public.activity_group_links;
create policy activity_group_links_select_policy on public.activity_group_links
for select using (
  exists (
    select 1
    from public.activity_logs al
    where al.id = activity_group_links.activity_log_id
      and al.user_id = auth.uid()
  )
  or public.is_group_member(group_id)
  or public.is_group_manager(group_id)
);

drop policy if exists activity_group_links_insert_policy on public.activity_group_links;
create policy activity_group_links_insert_policy on public.activity_group_links
for insert with check (
  linked_by = auth.uid()
  and exists (
    select 1
    from public.activity_logs al
    where al.id = activity_group_links.activity_log_id
      and al.user_id = auth.uid()
  )
  and public.is_group_member(group_id)
);

drop policy if exists activity_group_links_delete_policy on public.activity_group_links;
create policy activity_group_links_delete_policy on public.activity_group_links
for delete using (
  linked_by = auth.uid()
  or public.is_group_manager(group_id)
);
