# Zwibba Railway Production Runbook

This runbook covers the first production deployment of the real Zwibba stack in `/Users/pc/zwibba-website`:

- `apps/api` on Railway
- `apps/admin` on Railway
- Railway Postgres for `DATABASE_URL`
- Cloudflare R2 for media objects
- Twilio Verify for OTP/SMS

Official references used for this setup:

- Railway config and variables: <https://docs.railway.com/reference/config-as-code>
- Railway variables: <https://docs.railway.com/guides/variables>
- Railway Postgres: <https://docs.railway.com/guides/postgresql>
- Cloudflare R2 buckets: <https://developers.cloudflare.com/r2/buckets/create-buckets/>
- Cloudflare R2 presigned uploads: <https://developers.cloudflare.com/r2/api/s3/presigned-urls/>
- Twilio Verify service API: <https://www.twilio.com/docs/verify/api/service>
- Twilio Verify deliverability and geo checks: <https://www.twilio.com/docs/verify/verify-countries-and-regions-deliverability>

## 1. Create the Railway project

1. Create a new Railway project for Zwibba production.
2. Connect the GitHub repository that contains this monorepo.
3. Add a PostgreSQL service to the project.
4. Create separate Railway services for:
   - API service rooted at `apps/api`
   - Admin service rooted at `apps/admin`

## 2. Create the API service

Configure the API Railway service with:

- Root directory: `apps/api`
- Builder: Nixpacks
- Config file: `apps/api/nixpacks.toml`
- Build command: `pnpm --dir ../.. --filter @zwibba/api build`
- Start command: `pnpm --dir ../.. --filter @zwibba/api start`

Required API env variables:

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://...
APP_BASE_URL=https://zwibba-api.up.railway.app
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=zwibba-media
R2_PUBLIC_BASE_URL=https://cdn.zwibba.com
R2_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

Notes:

- `DATABASE_URL` should come from the Railway Postgres service.
- `APP_BASE_URL` should be the public API URL for the deployed Railway service until a separate app domain is introduced.
- The API health check endpoint is `GET /healthz`.

## 3. Create the admin service

Configure the admin Railway service with:

- Root directory: `apps/admin`
- Builder: Nixpacks
- Config file: `apps/admin/nixpacks.toml`
- Build command: `pnpm --dir ../.. --filter @zwibba/admin build`
- Start command: `pnpm --dir ../.. --filter @zwibba/admin start`

Required admin env variables:

```env
PORT=8080
ZWIBBA_API_BASE_URL=https://zwibba-api.up.railway.app
ZWIBBA_ADMIN_SHARED_SECRET=<long-random-secret>
```

Admin verification notes:

- `ZWIBBA_API_BASE_URL` must point to the deployed API Railway URL.
- Every request to the admin HTML surface must send `x-zwibba-admin-secret`.
- The admin surface is expected at `/moderation`.

## 4. Create the Cloudflare R2 bucket

1. Create a new Cloudflare R2 bucket named `zwibba-media`.
2. Generate an R2 access key pair with access limited to that bucket.
3. Set:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET`
   - `R2_PUBLIC_BASE_URL`
   - `R2_S3_ENDPOINT`
4. Confirm the public delivery hostname in `R2_PUBLIC_BASE_URL`.

The API already issues presigned upload URLs, so the mobile client can upload media directly to R2.

## 5. Create the Twilio Verify service

1. In Twilio, create a Verify Service.
2. Copy the Verify service SID into `TWILIO_VERIFY_SERVICE_SID`.
3. Copy `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` into Railway.
4. Confirm Verify deliverability and geo permissions for the Democratic Republic of the Congo before the first live OTP test.

## 6. Run the first deployment

Before the first Railway rollout, run the local contract checks:

```bash
npm run smoke:production-contracts
npm run smoke:monorepo
```

After Railway deploys:

1. Open the API public URL and verify:

```bash
curl https://<api-service>.up.railway.app/healthz
```

Expected response:

```json
{"status":"ok","database":"up"}
```

2. Open the admin surface with the shared secret header:

```bash
curl \
  -H "x-zwibba-admin-secret: <ZWIBBA_ADMIN_SHARED_SECRET>" \
  https://<admin-service>.up.railway.app/moderation
```

3. Confirm the admin service can reach `ZWIBBA_API_BASE_URL`.
4. Confirm the API can read `DATABASE_URL` and start without env validation errors.
5. Confirm the API can issue a Twilio Verify OTP challenge in test mode.
6. Confirm the API can return an R2 presigned upload URL.

## 7. First production smoke checklist

- `GET /healthz` returns `status: ok` and `database: up`
- the admin service returns `401` without `x-zwibba-admin-secret`
- the admin service returns HTML for `/moderation` with the correct secret
- the seller flow can request OTP through Twilio Verify
- the seller flow can create a draft with R2-backed photo metadata
- a synced draft can publish into a persisted listing and moderation decision

## 8. Secrets and operational rules

- Never store Twilio or R2 secrets in Flutter or the browser prototype.
- Keep `ZWIBBA_ADMIN_SHARED_SECRET` unique to production and rotate it if exposed.
- Keep Railway Postgres credentials only in Railway service variables.
- Keep Twilio Verify geo permissions and sender readiness checked before live rollout.
