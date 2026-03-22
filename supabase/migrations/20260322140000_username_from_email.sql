CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  email_prefix text;
  base_username text;
BEGIN
  -- 이메일 @앞부분 추출 후 영문자/숫자/언더스코어만 남김
  email_prefix := regexp_replace(
    split_part(coalesce(new.email, ''), '@', 1),
    '[^a-zA-Z0-9_]', '', 'g'
  );

  -- 이메일 앞부분이 있으면 사용, 없으면 UUID 앞부분으로 폴백
  base_username := 'myamen_' || coalesce(
    nullif(email_prefix, ''),
    replace(substr(new.id::text, 1, 10), '-', '')
  );

  INSERT INTO public.profiles (id, email, full_name, nickname, avatar_url, username)
  VALUES (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), '')
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), '')
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
      nullif(trim(new.raw_user_meta_data->>'picture'), '')
    ),
    base_username
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    nickname = COALESCE(profiles.nickname, EXCLUDED.nickname),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

  RETURN new;
END;
$function$;
