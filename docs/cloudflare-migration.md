# Cloudflare Migration Guide

## Scope

This repository is now aligned to:

- Cloudflare Pages for the frontend
- Cloudflare Worker for `/api/*`
- D1 for custom auth, sessions, notifications, push subscription records, and bible audio metadata
- R2 for existing file storage

Supabase auth is removed from the application flow.

Supabase is still temporarily required for the parts of the client that still call `supabase.from(...)` and `supabase.rpc(...)` directly. That means this migration is safe for deployment/runtime cutover and auth cutover, but it is not yet a full data-layer migration away from Supabase.

## Repository Layout

- Worker entry: `workers/api/src/index.ts`
- Worker config: `wrangler.api.toml`
- D1 migrations:
  - `cloudflare/d1/migrations/0001_initial.sql`
  - `cloudflare/d1/migrations/0002_auth.sql`
- Audio export script: `scripts/export-bible-audio-metadata-for-d1.mjs`
- Frontend API bootstrap:
  - `client/src/lib/bootstrapApiBase.ts`
  - `client/src/lib/queryClient.ts`
- Custom auth client:
  - `client/src/lib/auth-client.ts`

## What Changed

- Worker auth moved from Supabase token verification to D1-backed cookie sessions.
- New auth endpoints were added:
  - `GET /api/auth/user`
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/logout`
  - `POST /api/auth/check-availability`
  - `POST /api/auth/find-id`
  - `POST /api/auth/reset-password`
  - `GET /api/auth/oauth/kakao/start`
  - `GET /api/auth/oauth/kakao/callback`
- User profile endpoints were added:
  - `GET /api/user/profile`
  - `PUT /api/user/profile`
  - `DELETE /api/user/delete`
- Notifications and push subscription storage now use D1:
  - `GET /api/notifications`
  - `POST /api/notifications/read`
  - `POST /api/notifications/read-all`
  - `POST /api/push/subscribe`
  - `POST /api/push/unsubscribe`
  - `POST /api/push/send`
- Frontend auth pages and modals now use the Worker auth API.
- `wrangler.api.toml` is the single Worker config entrypoint.

## Cloudflare Setup

### 1. Create D1

```bash
npx wrangler d1 create qt2026-d1
```

Copy the returned `database_id` into [wrangler.api.toml](/c:/Users/mmjb/OneDrive/Desktop/qt2026/wrangler.api.toml).

### 2. Apply D1 migrations

```bash
npm run d1:migrate:remote
```

This creates:

- `bible_audio_metadata`
- `push_subscriptions`
- `app_notifications`
- `auth_users`
- `profiles`
- `auth_sessions`
- `user_terms_agreements`

### 3. Bind the existing R2 bucket

Update [wrangler.api.toml](/c:/Users/mmjb/OneDrive/Desktop/qt2026/wrangler.api.toml):

- `[[r2_buckets]].bucket_name`

### 4. Set Worker vars/secrets

Required:

```bash
npx wrangler secret put R2_PUBLIC_URL --config wrangler.api.toml
```

Recommended non-secret vars in `wrangler.api.toml`:

- `CORS_ALLOW_ORIGIN`
- `FRONTEND_BASE_URL`

Recommended runtime vars/secrets:

- `SESSION_COOKIE_DOMAIN`
  - example: `.myamen.co.kr`
- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `KAKAO_REDIRECT_URI`
  - optional if you want to override the default Worker callback URL
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `PUSH_SERVER_KEY`

Optional temporary fallback only for `bible_audio_metadata`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If you import audio metadata into D1 before cutover, you do not need that fallback.

### 5. Kakao Developer Console

Set these before Kakao login can work:

- Redirect URI:
  - `https://api.your-domain.com/api/auth/oauth/kakao/callback`
- JavaScript origin:
  - `https://your-pages-domain.com`

Use your real custom domains, not the placeholder above.

## Pages Setup

Create a Cloudflare Pages project from GitHub:

- Framework preset: `Vite`
- Root directory: `client`
- Build command: `npm ci && npm run build`
- Build output directory: `dist`

Pages environment variables:

- `VITE_API_BASE_URL=https://api.your-domain.com`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`
- `VITE_R2_PUBLIC_URL=...`
- `VITE_VAPID_PUBLIC_KEY=...` if push is used

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must stay for now because non-auth app data is still read directly from Supabase in several screens.

## Audio Metadata Move

Export from Supabase:

```bash
npm run cf:d1:export-audio
```

Import into D1:

```bash
npx wrangler d1 execute qt2026-d1 --remote --file cloudflare/d1/seed/bible_audio_metadata.sql --config wrangler.api.toml
```

## Zero Trust / Custom Domain

Recommended target shape:

- Pages custom domain:
  - `https://myamen.co.kr`
- Worker custom domain:
  - `https://api.myamen.co.kr`

Recommended Zero Trust policy usage:

- protect operator/admin-only endpoints
  - example: `/api/push/send`
  - example: future `/api/admin/*`
- do not protect user-facing auth endpoints with Access
  - `/api/auth/*`
  - `/api/user/*`
  - `/api/notifications*`

If you use a custom cookie domain, make it match your registrable domain:

- `SESSION_COOKIE_DOMAIN=.myamen.co.kr`

## GitHub Actions

Current workflow file:

- [.github/workflows/cloudflare-deploy.yml](/c:/Users/mmjb/OneDrive/Desktop/qt2026/.github/workflows/cloudflare-deploy.yml)

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow already deploys:

1. Worker with `wrangler.api.toml`
2. Pages from `client/dist`

## Vercel / Supabase / Cloudflare / GitHub Cutover Order

### Vercel

1. Do not delete the Vercel project yet.
2. Leave the last working production deployment intact during the rollback window.
3. After Cloudflare is stable, remove the production alias or disconnect the domain.

### Supabase

1. Leave the project alive for now.
2. Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Pages until the remaining direct client queries are migrated.
3. You can ignore existing Supabase auth users and start fresh because auth is now D1-backed.
4. After all direct `supabase.from/rpc` usage is removed from the client, then remove Supabase from runtime.

### Cloudflare

1. Create D1 and apply migrations.
2. Bind R2 and set Worker secrets.
3. Set the Worker custom domain.
4. Create the Pages project and set env vars.
5. Deploy Worker first.
6. Deploy Pages second.
7. Test login, register, Kakao login, profile edit, logout, account delete, notification fetch, file upload.

### GitHub

1. Add Cloudflare secrets to Actions.
2. Push the migration branch.
3. Confirm Worker deploy passes before switching DNS.
4. Confirm Pages deploy passes before changing the main domain.

## Known Limits After This Change

- Group invite auto-join after signup is intentionally disabled until the group backend is migrated off Supabase RPC.
- Community/group/prayer/reading data still include direct Supabase client access.
- Because of that, this is not the last migration step if your goal is a full D1-only application backend.

## Rollback

- Git rollback tag:
  - `backup/pre-cloudflare-migration-20260307`
- Frontend rollback:
  - redeploy the previous Pages build or restore the Vercel domain
- API rollback:
  - redeploy the previous Worker version or route traffic back to the old backend
