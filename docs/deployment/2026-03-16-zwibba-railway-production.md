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
OTP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...
DEMO_OTP_CODE=123456
DEMO_OTP_ALLOWLIST=+243990000001
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
- `OTP_PROVIDER=twilio` is the default production path once Twilio Verify is ready.
- `OTP_PROVIDER=demo` is the temporary beta path. In that mode, `DEMO_OTP_CODE` and `DEMO_OTP_ALLOWLIST` are required, and Twilio vars are not used.
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
5. Configure bucket CORS for browser uploads from:
   - `https://website-production-7a12.up.railway.app`
   - `http://127.0.0.1:3003`
   - `http://localhost:3003`
   Allow methods `PUT`, `GET`, `HEAD`, allow header `content-type`, and expose `etag`.

The API already issues presigned upload URLs, so the mobile client can upload media directly to R2.

## 5. Create the Twilio Verify service

1. In Twilio, create a Verify Service.
2. Copy the Verify service SID into `TWILIO_VERIFY_SERVICE_SID`.
3. Copy `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` into Railway.
4. Confirm Verify deliverability and geo permissions for the Democratic Republic of the Congo before the first live OTP test.

## 5b. Temporary demo OTP mode

Use this only for a controlled beta while Twilio is not ready.

1. Set `OTP_PROVIDER=demo` on the API service.
2. Set `DEMO_OTP_CODE` to a temporary code such as `123456`.
3. Set `DEMO_OTP_ALLOWLIST` to a comma-separated list of approved numbers.
4. Keep the allowlist narrow because anyone with the code and an allowed number can obtain a session.
5. Switch back to `OTP_PROVIDER=twilio` before public launch.

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
5. Confirm the API can issue an OTP challenge through the configured provider.
6. Confirm the API can return an R2 presigned upload URL.

## 7. First production smoke checklist

- `GET /healthz` returns `status: ok` and `database: up`
- the admin service returns `401` without `x-zwibba-admin-secret`
- the admin service returns HTML for `/moderation` with the correct secret
- the public browser beta at `/App/#home` shows real listing pictures when approved listings have uploaded photos
- the public browser beta buyer detail route at `/App/#listing/<slug>` shows the hero image for listings with uploaded photos
- the public browser beta desktop shell keeps the phone frame capped to the viewport and scrolls content inside the phone instead of stretching the device
- the public browser beta seller flow at `/App/#capture` accepts a real image file or mobile camera capture instead of demo photo presets
- the seller flow uploads the first photo immediately to R2 before leaving capture and shows retryable status if a guided upload fails
- the seller flow can request OTP through the configured provider
- the seller flow can create a draft with R2-backed photo metadata
- the seller review and seller success screens show the first draft image when a photo exists
- a synced draft can publish into a persisted listing and moderation decision

### Internal beta live E2E helpers

From the repo root:

```bash
npm run test:e2e:seller:beta
npm run test:e2e:messages:beta
npm run test:e2e:matrix:beta
npm run test:e2e:beta
```

The device QA checklist and tester path live in:

- `docs/deployment/2026-04-05-zwibba-internal-beta-device-qa.md`

## 8. Secrets and operational rules

- Never store Twilio or R2 secrets in Flutter or the browser prototype.
- Keep `ZWIBBA_ADMIN_SHARED_SECRET` unique to production and rotate it if exposed.
- Keep Railway Postgres credentials only in Railway service variables.
- Treat demo OTP as temporary and restrict it with a narrow allowlist.
- Keep Twilio Verify geo permissions and sender readiness checked before live rollout.
