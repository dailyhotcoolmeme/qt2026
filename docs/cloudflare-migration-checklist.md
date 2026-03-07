# Cloudflare Migration Checklist (Pages + Workers + D1 + R2)

## 1) What This Commit Changes

- Added a Cloudflare Worker API entrypoint: `workers/api/src/index.ts`
- Added D1 migrations:
  - `cloudflare/d1/migrations/0001_initial.sql`
  - `cloudflare/d1/migrations/0002_auth.sql`
- Added Worker config: `wrangler.api.toml`
- Moved auth/session flow to Worker + D1:
  - login/register/logout/current-user
  - profile update/delete
  - Kakao OAuth callback
  - notification and push subscription storage
- Added frontend API bootstrap:
  - `client/src/lib/bootstrapApiBase.ts`
  - `client/src/main.tsx` imports/executes bootstrap
  - `client/src/lib/queryClient.ts` includes credentials for API calls
- Added custom frontend auth client:
  - `client/src/lib/auth-client.ts`
- Added npm scripts for Worker and D1 operations in root `package.json`

## 2) Important Scope Note

This repository is now in a safe staged migration state:

- Runtime/API hosting can move from Vercel to Cloudflare Worker now.
- User-facing auth can move off Supabase now.
- Local email/password accounts are shadow-synced to Supabase during the transition so legacy direct data access keeps working.
- R2 stays in place and is used by the Worker.
- D1 now stores Worker-managed auth/session/push/notification data.
- Supabase is still required for screens that still call `supabase.from(...)` and `supabase.rpc(...)` directly.

Do not shut down Supabase yet until those direct client calls are migrated.

## 3) Cloudflare Tasks

1. Create D1 database.
   - Example: `npx wrangler d1 create qt2026-d1`
2. Update `wrangler.api.toml`.
   - Set `database_id = "REPLACE_WITH_D1_DATABASE_ID"`
   - Set `bucket_name = "REPLACE_WITH_R2_BUCKET_NAME"`
   - Set `FRONTEND_BASE_URL`
3. Apply D1 migrations.
   - Local: `npm run d1:migrate:local`
   - Remote: `npm run d1:migrate:remote`
4. Set Worker vars/secrets.
   - Required:
     - `R2_PUBLIC_URL`
     - `FRONTEND_BASE_URL`
     - `KAKAO_CLIENT_ID`
     - `KAKAO_CLIENT_SECRET`
   - Required when app/API use different subdomains:
     - `SESSION_COOKIE_DOMAIN`
   - Optional by feature:
     - `NAVER_CLIENT_ID`
     - `NAVER_CLIENT_SECRET`
     - `OPENAI_API_KEY`
     - `PUSH_SERVER_KEY`
   - Temporary Supabase compatibility:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy API Worker.
   - `npm run deploy:worker`
6. Create Cloudflare Pages project.
   - Framework preset: `Vite`
   - Root directory: `client`
   - Build command: `npm ci && npm run build`
   - Output directory: `dist`
7. Set Pages environment variables.
   - `VITE_API_BASE_URL=https://<your-worker-domain>`
   - `VITE_R2_PUBLIC_URL=https://<your-r2-public-domain>`
   - `VITE_VAPID_PUBLIC_KEY=...` if push is used
   - Keep existing `VITE_SUPABASE_URL`
   - Keep existing `VITE_SUPABASE_ANON_KEY`
8. Add custom domains.
   - App domain to Pages
   - API domain to Worker

## 4) Zero Trust / Access Tasks

1. Create Access applications only for operator/admin surfaces if needed.
2. Do not put these behind Access:
   - `/api/auth/*`
   - `/api/user/*`
   - `/api/notifications*`
3. If API is cross-domain:
   - Ensure `CORS_ALLOW_ORIGIN` matches the Pages origin
   - Set `SESSION_COOKIE_DOMAIN` to the shared parent domain

## 5) Vercel Tasks

1. Keep the Vercel project intact during the rollback window.
2. Do not delete the old production deployment yet.
3. After Cloudflare Worker and Pages are verified, move the domain/DNS cutover.
4. Only after the verification window ends, remove the production alias or disable production deployment.

## 6) Supabase Tasks

1. Keep Supabase running for now.
2. Existing old Supabase auth users can be ignored or deleted.
3. New local email/password users are shadow-synced to Supabase during the transition.
4. Keep the public data tables and RPCs alive until client-side direct usage is removed.
5. Export backups before each cut step.
   - Public tables
   - RPC definitions you still depend on
6. After the remaining `supabase.from/rpc` usage is removed:
   - rotate keys
   - remove `VITE_SUPABASE_*` from Pages
   - remove Worker fallback envs
   - shut Supabase down

## 7) GitHub Tasks

1. Add repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
2. Use `.github/workflows/cloudflare-deploy.yml` for deployment.
3. Push the migration branch and verify both Worker and Pages deploys pass.

## 8) Rollback Plan

1. Keep Vercel + Supabase live until Cloudflare is proven.
2. If incident occurs:
   - restore DNS/custom domain to the old target
   - redeploy the previous app/API target
   - reset code to the backup tag or the migration commit predecessor
3. Current rollback tag:
   - `backup/pre-cloudflare-migration-20260307`
