-- group_post_images에 파일 첨부 지원을 위한 컬럼 추가
ALTER TABLE public.group_post_images
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS content_type text;
