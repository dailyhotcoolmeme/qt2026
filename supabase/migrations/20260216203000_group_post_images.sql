-- Group post image attachments
-- 2026-02-16

create table if not exists public.group_post_images (
  id bigserial primary key,
  post_id bigint not null references public.group_posts(id) on delete cascade,
  uploader_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists group_post_images_post_sort_idx
  on public.group_post_images(post_id, sort_order, created_at);

alter table public.group_post_images enable row level security;

drop policy if exists group_post_images_select_policy on public.group_post_images;
create policy group_post_images_select_policy on public.group_post_images
for select using (
  exists (
    select 1
    from public.group_posts gp
    where gp.id = group_post_images.post_id
      and (
        public.is_group_member(gp.group_id)
        or public.is_scope_leader_for_group(gp.group_id)
      )
  )
);

drop policy if exists group_post_images_insert_policy on public.group_post_images;
create policy group_post_images_insert_policy on public.group_post_images
for insert with check (
  uploader_id = auth.uid()
  and exists (
    select 1
    from public.group_posts gp
    where gp.id = group_post_images.post_id
      and public.is_group_member(gp.group_id)
  )
);

drop policy if exists group_post_images_delete_policy on public.group_post_images;
create policy group_post_images_delete_policy on public.group_post_images
for delete using (
  uploader_id = auth.uid()
  or exists (
    select 1
    from public.group_posts gp
    where gp.id = group_post_images.post_id
      and public.is_group_manager(gp.group_id)
  )
);
