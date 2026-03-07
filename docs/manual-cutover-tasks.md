# Manual Cutover Tasks

## 1. Cloudflare Worker

- [ ] `wrangler.api.toml` placeholder 교체
- [ ] `database_id` 입력
- [ ] `bucket_name` 입력
- [ ] `FRONTEND_BASE_URL` 입력
- [ ] `CORS_ALLOW_ORIGIN` 입력
- [ ] D1 생성

```bash
npx wrangler d1 create qt2026-d1
```

- [ ] D1 마이그레이션 적용

```bash
npm run d1:migrate:remote
```

- [ ] Worker secret/var 설정
  - `R2_PUBLIC_URL`
  - `KAKAO_CLIENT_ID`
  - `KAKAO_CLIENT_SECRET`
  - `SESSION_COOKIE_DOMAIN` 예: `.myamen.co.kr`
  - `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` 필요 시
  - `OPENAI_API_KEY` 필요 시
  - `PUSH_SERVER_KEY` 필요 시
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

- [ ] Worker 배포

```bash
npm run deploy:worker
```

## 2. Cloudflare Pages

- [ ] Pages 프로젝트 생성
- [ ] Root directory: `client`
- [ ] Build command: `npm ci && npm run build`
- [ ] Output directory: `dist`
- [ ] Pages env 설정
  - `VITE_API_BASE_URL=https://api.<your-domain>`
  - `VITE_SUPABASE_URL=...`
  - `VITE_SUPABASE_ANON_KEY=...`
  - `VITE_R2_PUBLIC_URL=...`
  - `VITE_VAPID_PUBLIC_KEY=...` 필요 시

## 3. Cloudflare Custom Domain / Zero Trust

- [ ] Pages 도메인 연결
  - 예: `https://myamen.co.kr`
- [ ] Worker custom domain 연결
  - 예: `https://api.myamen.co.kr`
- [ ] `SESSION_COOKIE_DOMAIN`을 최상위 도메인으로 맞춤
  - 예: `.myamen.co.kr`
- [ ] Zero Trust를 쓸 경우 Pages 쪽만 우선 제한
- [ ] `/api/auth/*`, `/api/user/*`, `/api/notifications*` 는 Access로 막지 않음
- [ ] 관리자 전용 경로만 Access 적용
  - 예: `/api/push/send`

## 4. Kakao Developer Console

- [ ] Redirect URI 등록
  - `https://api.<your-domain>/api/auth/oauth/kakao/callback`
- [ ] JavaScript origin 등록
  - `https://<your-pages-domain>`

## 5. GitHub

- [ ] Repository Secrets 추가
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
- [ ] `.github/workflows/cloudflare-deploy.yml` 의 Pages project name 확인
  - 현재 값: `qt2026`
- [ ] 브랜치 push 후 Actions 성공 확인

## 6. Supabase

- [ ] 기존 Supabase project는 유지
- [ ] 기존 Supabase Auth 유저는 무시 가능
- [ ] public table / RPC는 아직 유지
- [ ] `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 제거하지 않음
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 를 Worker에서 유지
- [ ] 로컬 이메일/비밀번호 계정은 shadow Supabase session을 같이 사용함
- [ ] Kakao 경로까지 완전히 Supabase-free 로 만들려면 후속 데이터 레이어 이관이 더 필요함

## 7. Audio Metadata

- [ ] 오디오 메타데이터를 D1으로 옮길 경우:

```bash
npm run cf:d1:export-audio
npx wrangler d1 execute qt2026-d1 --remote --file cloudflare/d1/seed/bible_audio_metadata.sql --config wrangler.api.toml
```

- [ ] 아직 옮기지 않으면 Worker에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 유지

## 8. Verification

- [ ] 이메일/비밀번호 회원가입
- [ ] 이메일/비밀번호 로그인
- [ ] 로그아웃
- [ ] 비밀번호 재설정
- [ ] 프로필 수정
- [ ] 회원탈퇴
- [ ] Kakao 로그인
- [ ] 파일 업로드/삭제
- [ ] 오디오 업로드/삭제/이동
- [ ] 알림 조회
- [ ] 푸시 구독

## 9. Vercel

- [ ] Vercel 프로젝트 삭제하지 않음
- [ ] 이전 프로덕션 배포 유지
- [ ] Cloudflare 검증 후에만 도메인 분리 또는 production alias 제거

## 10. Rollback

- [ ] 사전 백업 태그 확인
  - `backup/pre-cloudflare-migration-20260307`
- [ ] 최신 마이그레이션 커밋 확인

```bash
git log --oneline -3
```

- [ ] 로컬 롤백 브랜치가 필요하면:

```bash
git switch -c rollback/pre-cloudflare backup/pre-cloudflare-migration-20260307
```

- [ ] 이미 push 후 안전하게 되돌릴 때:

```bash
git log --oneline -3
git revert --no-edit <latest-migration-commit>
git revert --no-edit <previous-migration-commit>
```
