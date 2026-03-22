-- endpoint 컬럼을 nullable로 변경 (FCM/APNs 토큰은 endpoint 없음)
alter table public.push_subscriptions
  alter column endpoint drop not null;

-- unique index를 WHERE endpoint IS NOT NULL 조건으로 재생성 (부분 인덱스)
drop index if exists public.push_subscriptions_channel_endpoint_uidx;

create unique index if not exists push_subscriptions_channel_endpoint_uidx
  on public.push_subscriptions(channel, endpoint)
  where endpoint is not null;
