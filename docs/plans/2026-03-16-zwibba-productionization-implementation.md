# Zwibba Productionization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the current Zwibba monorepo into a deployable product baseline by replacing in-memory and placeholder behavior with Railway Postgres, Cloudflare R2, and Twilio Verify.

**Architecture:** Keep `/App` as the UX reference, but productionize only `apps/mobile`, `apps/api`, and `apps/admin`. `apps/api` becomes the single system of record using Prisma on Railway Postgres. Mobile uploads media directly to Cloudflare R2 via API-issued presigned URLs. OTP is delegated to Twilio Verify while Zwibba owns its own session records.

**Tech Stack:** Flutter 3, NestJS 11, Prisma ORM, Railway Postgres, Cloudflare R2 S3-compatible uploads, Twilio Verify, PNPM workspaces, Node-based smoke checks.

---

### Task 13: Add Railway-ready API foundation with Prisma, env validation, and health checks

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/.env.example`
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260316110000_platform_foundation/migration.sql`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/database/database.module.ts`
- Create: `apps/api/src/database/prisma.service.ts`
- Create: `apps/api/src/health/health.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Create: `apps/api/test/health/health.e2e-spec.ts`

**Step 1: Write the failing API foundation tests**

- `GET /healthz` should return `status: ok` and `database: up` when Prisma is wired.
- API startup should read a validated environment contract instead of ad hoc `process.env` access.
- Prisma schema validation should fail until the schema exists.

**Step 2: Run the targeted checks to verify failure**

Run: `pnpm -C apps/api test -- health`
Run: `pnpm -C apps/api exec prisma validate`
Expected: FAIL because Prisma, `/healthz`, and the validated env layer do not exist yet.

**Step 3: Write the minimal implementation**

- Add `prisma` and `@prisma/client` to `apps/api/package.json`.
- Add a validated env loader for:
  - `NODE_ENV`
  - `PORT`
  - `DATABASE_URL`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_VERIFY_SERVICE_SID`
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
  - `R2_PUBLIC_BASE_URL`
  - `R2_S3_ENDPOINT`
  - `APP_BASE_URL`
- Add Prisma service wiring and a health endpoint that checks DB connectivity.
- Enable CORS in `main.ts` for the Flutter client and local admin access.
- Create the initial schema file and first migration scaffold.

**Step 4: Run the targeted checks again**

Run: `pnpm -C apps/api test -- health`
Run: `pnpm -C apps/api exec prisma validate`
Run: `pnpm -C apps/api exec tsc --noEmit`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: add api production foundation"
```

### Task 14: Replace mock OTP with Twilio Verify and persistent Zwibba sessions

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260316120000_auth_sessions/migration.sql`
- Create: `apps/api/src/auth/twilio-verify.service.ts`
- Create: `apps/api/src/auth/session-auth.guard.ts`
- Create: `apps/api/src/auth/current-session.decorator.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/test/auth/request-otp.e2e-spec.ts`
- Modify: `apps/api/test/auth/publish-gate.e2e-spec.ts`
- Modify: `apps/mobile/pubspec.yaml`
- Create: `apps/mobile/lib/services/session_storage_service.dart`
- Modify: `apps/mobile/lib/services/auth_api_service.dart`
- Modify: `apps/mobile/lib/app.dart`
- Modify: `apps/mobile/lib/features/auth/phone_input_screen.dart`
- Modify: `apps/mobile/lib/features/auth/otp_screen.dart`
- Modify: `apps/mobile/lib/features/profile/profile_screen.dart`
- Create: `apps/mobile/test/services/session_storage_service_test.dart`
- Modify: `apps/mobile/test/features/auth/publish_gate_test.dart`
- Modify: `apps/mobile/test/features/profile/profile_screen_test.dart`

**Step 1: Write the failing auth and session tests**

- Requesting OTP should create a persisted verification attempt and call a Twilio Verify adapter.
- Verifying OTP should create or refresh a persisted user plus session record.
- Mobile app restart should restore a verified session from secure storage.
- Protected seller operations should require a valid session token instead of trusting local-only state.

**Step 2: Run the targeted tests to verify failure**

Run: `pnpm -C apps/api test -- request-otp`
Run: `pnpm -C apps/api test -- publish-gate`
Run: `flutter test test/services/session_storage_service_test.dart test/features/auth/publish_gate_test.dart test/features/profile/profile_screen_test.dart`
Expected: FAIL because Twilio integration, persisted sessions, and mobile secure session restore do not exist yet.

**Step 3: Write the minimal implementation**

- Add a Twilio Verify service interface with a fake test implementation and a real production implementation.
- Persist `User`, `Session`, and verification-attempt records through Prisma.
- Add a guard that resolves the current session from a bearer token.
- Store the mobile session token in secure storage and restore it during app bootstrap.
- Show the verified phone number in profile and route unauthenticated seller actions through the OTP flow.

**Step 4: Run the targeted tests again**

Run: `pnpm -C apps/api test -- request-otp`
Run: `pnpm -C apps/api test -- publish-gate`
Run: `flutter test test/services/session_storage_service_test.dart test/features/auth/publish_gate_test.dart test/features/profile/profile_screen_test.dart`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api apps/mobile
git commit -m "feat: persist auth sessions with twilio verify"
```

### Task 15: Add Cloudflare R2 upload flow and persistent seller drafts

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260316130000_drafts_and_media/migration.sql`
- Create: `apps/api/src/media/media.module.ts`
- Create: `apps/api/src/media/media.controller.ts`
- Create: `apps/api/src/media/media.service.ts`
- Create: `apps/api/src/media/r2-storage.service.ts`
- Modify: `apps/api/src/drafts/drafts.controller.ts`
- Modify: `apps/api/src/drafts/drafts.service.ts`
- Create: `apps/api/test/media/upload-url.e2e-spec.ts`
- Create: `apps/api/test/drafts/drafts-persistence.e2e-spec.ts`
- Modify: `apps/mobile/pubspec.yaml`
- Modify: `apps/mobile/lib/models/listing_draft.dart`
- Create: `apps/mobile/lib/services/media_api_service.dart`
- Create: `apps/mobile/lib/services/local_draft_cache_service.dart`
- Modify: `apps/mobile/lib/features/post/camera_screen.dart`
- Modify: `apps/mobile/lib/features/post/photo_guidance_screen.dart`
- Modify: `apps/mobile/lib/features/post/review_form_screen.dart`
- Modify: `apps/mobile/lib/app.dart`
- Create: `apps/mobile/test/services/media_api_service_test.dart`
- Create: `apps/mobile/test/services/local_draft_cache_service_test.dart`
- Modify: `apps/mobile/test/features/post/post_flow_test.dart`

**Step 1: Write the failing media and draft tests**

- API should return a presigned R2 upload URL plus an object key for a draft photo.
- Draft sync should persist draft metadata and photo records in Postgres.
- Mobile capture flow should attach real photo records to the draft model instead of preset-only placeholders.
- Restarting the app should restore the current local draft and its upload state.

**Step 2: Run the targeted tests to verify failure**

Run: `pnpm -C apps/api test -- upload-url`
Run: `pnpm -C apps/api test -- drafts-persistence`
Run: `flutter test test/services/media_api_service_test.dart test/services/local_draft_cache_service_test.dart test/features/post/post_flow_test.dart`
Expected: FAIL because R2 upload contracts, persisted drafts, and mobile draft restore do not exist yet.

**Step 3: Write the minimal implementation**

- Add R2 client configuration using presigned `PUT` upload URLs.
- Extend the Prisma schema with `Draft` and `DraftPhoto`.
- Persist draft metadata and uploaded photo references in Postgres.
- Add a testable mobile media API service for:
  - requesting upload slots
  - uploading files to presigned URLs
  - confirming uploaded photos against a draft
- Replace the pure preset flow with a real photo capture/select path while preserving the seller-first UX.
- Cache the local in-progress draft so the seller can resume after restart.

**Step 4: Run the targeted tests again**

Run: `pnpm -C apps/api test -- upload-url`
Run: `pnpm -C apps/api test -- drafts-persistence`
Run: `flutter test test/services/media_api_service_test.dart test/services/local_draft_cache_service_test.dart test/features/post/post_flow_test.dart`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api apps/mobile
git commit -m "feat: add persisted drafts and r2 uploads"
```

### Task 16: Persist publish, listings, and moderation, and make admin deployable

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260316140000_listings_and_moderation/migration.sql`
- Modify: `apps/api/src/drafts/drafts.service.ts`
- Modify: `apps/api/src/moderation/moderation.controller.ts`
- Modify: `apps/api/src/moderation/moderation.service.ts`
- Modify: `apps/api/src/listings/listings.controller.ts`
- Modify: `apps/api/src/listings/listings.service.ts`
- Modify: `apps/api/test/moderation/publish-outcome.e2e-spec.ts`
- Modify: `apps/api/test/listings/listings.e2e-spec.ts`
- Modify: `apps/mobile/lib/services/draft_api_service.dart`
- Modify: `apps/mobile/lib/services/listings_api_service.dart`
- Modify: `apps/mobile/lib/app.dart`
- Modify: `apps/mobile/lib/features/post/publish_success_screen.dart`
- Modify: `apps/mobile/lib/features/post/publish_pending_screen.dart`
- Modify: `apps/mobile/lib/features/post/publish_blocked_screen.dart`
- Modify: `apps/mobile/test/features/post/publish_outcome_test.dart`
- Modify: `apps/mobile/test/features/browse/browse_screen_test.dart`
- Modify: `apps/mobile/test/features/listings/listing_detail_screen_test.dart`
- Modify: `apps/admin/package.json`
- Create: `apps/admin/.env.example`
- Create: `apps/admin/src/config/env.ts`
- Create: `apps/admin/src/server.ts`
- Modify: `apps/admin/src/main.ts`
- Modify: `apps/admin/src/moderation/moderation-page.ts`
- Modify: `apps/admin/test/moderation-page.test.ts`

**Step 1: Write the failing publish, listings, and admin tests**

- Publishing a valid synced draft should create a persisted listing and moderation decision.
- Buyer listings endpoints should return DB-backed published listings, including newly published ones.
- Admin queue should load pending items from the database instead of in-memory fixtures.
- Admin service should be runnable as a protected HTTP surface instead of only a console HTML renderer.

**Step 2: Run the targeted tests to verify failure**

Run: `pnpm -C apps/api test -- publish-outcome`
Run: `pnpm -C apps/api test -- listings`
Run: `pnpm -C apps/admin test -- moderation`
Run: `flutter test test/features/post/publish_outcome_test.dart test/features/browse/browse_screen_test.dart test/features/listings/listing_detail_screen_test.dart`
Expected: FAIL because publish, listings, and admin are not yet DB-backed or deployable.

**Step 3: Write the minimal implementation**

- Extend the schema with `Listing` and `ModerationDecision`.
- Make publish a DB transaction that validates draft completeness, creates or updates the listing, and writes the moderation state.
- Keep the deterministic moderation rules for now, but persist their results.
- Replace fixture-based listing responses with database-backed listing queries.
- Turn `apps/admin` into a minimal HTTP server that renders the moderation page and protects access through env-configured basic auth or shared-secret headers.

**Step 4: Run the targeted tests again**

Run: `pnpm -C apps/api test -- publish-outcome`
Run: `pnpm -C apps/api test -- listings`
Run: `pnpm -C apps/admin test -- moderation`
Run: `flutter test test/features/post/publish_outcome_test.dart test/features/browse/browse_screen_test.dart test/features/listings/listing_detail_screen_test.dart`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api apps/mobile apps/admin
git commit -m "feat: persist publish and moderation flows"
```

### Task 17: Persist chat, wallet, and boost flows behind real sessions

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260316150000_chat_wallet_boost/migration.sql`
- Modify: `apps/api/src/chat/chat.controller.ts`
- Modify: `apps/api/src/chat/chat.service.ts`
- Modify: `apps/api/src/wallet/wallet.controller.ts`
- Modify: `apps/api/src/wallet/wallet.service.ts`
- Modify: `apps/api/src/boost/boost.controller.ts`
- Modify: `apps/api/src/boost/boost.service.ts`
- Modify: `apps/api/test/chat/chat.e2e-spec.ts`
- Modify: `apps/api/test/wallet/wallet.e2e-spec.ts`
- Modify: `apps/api/test/boost/boost.e2e-spec.ts`
- Modify: `apps/mobile/lib/services/chat_api_service.dart`
- Modify: `apps/mobile/lib/services/wallet_api_service.dart`
- Modify: `apps/mobile/lib/features/chat/inbox_screen.dart`
- Modify: `apps/mobile/lib/features/chat/thread_screen.dart`
- Modify: `apps/mobile/lib/features/wallet/wallet_screen.dart`
- Modify: `apps/mobile/lib/features/boost/boost_offer_sheet.dart`
- Modify: `apps/mobile/lib/features/profile/profile_screen.dart`
- Modify: `apps/mobile/lib/app.dart`
- Modify: `apps/mobile/test/services/chat_api_service_test.dart`
- Modify: `apps/mobile/test/services/wallet_api_service_test.dart`
- Modify: `apps/mobile/test/features/chat/inbox_screen_test.dart`
- Modify: `apps/mobile/test/features/chat/thread_screen_test.dart`
- Modify: `apps/mobile/test/features/wallet/wallet_screen_test.dart`
- Modify: `apps/mobile/test/features/boost/boost_offer_sheet_test.dart`
- Modify: `apps/mobile/test/features/profile/profile_screen_test.dart`

**Step 1: Write the failing persisted-flow tests**

- Chat threads and sent messages should persist in Postgres and be scoped to real sessions.
- Wallet endpoint should return ledger-backed balance and history.
- Boost should create a persisted purchase row and wallet debit instead of a fixture response.
- Profile should reflect the current persisted identity and session state.

**Step 2: Run the targeted tests to verify failure**

Run: `pnpm -C apps/api test -- chat`
Run: `pnpm -C apps/api test -- wallet`
Run: `pnpm -C apps/api test -- boost`
Run: `flutter test test/services/chat_api_service_test.dart test/services/wallet_api_service_test.dart test/features/chat/inbox_screen_test.dart test/features/chat/thread_screen_test.dart test/features/wallet/wallet_screen_test.dart test/features/boost/boost_offer_sheet_test.dart test/features/profile/profile_screen_test.dart`
Expected: FAIL because these flows still use deterministic in-memory behavior.

**Step 3: Write the minimal implementation**

- Extend the schema with `ChatThread`, `ChatMessage`, `WalletTransaction`, and `BoostPurchase`.
- Require the persisted session token for chat continuity, wallet access, and boost activation.
- Compute wallet balance from the ledger rows rather than hardcoded totals.
- Record each boost activation as both a purchase record and a wallet debit.
- Update the mobile app so these tabs load persisted data and gracefully handle unauthenticated states.

**Step 4: Run the targeted tests again**

Run: `pnpm -C apps/api test -- chat`
Run: `pnpm -C apps/api test -- wallet`
Run: `pnpm -C apps/api test -- boost`
Run: `flutter test test/services/chat_api_service_test.dart test/services/wallet_api_service_test.dart test/features/chat/inbox_screen_test.dart test/features/chat/thread_screen_test.dart test/features/wallet/wallet_screen_test.dart test/features/boost/boost_offer_sheet_test.dart test/features/profile/profile_screen_test.dart`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api apps/mobile
git commit -m "feat: persist chat wallet and boost flows"
```

### Task 18: Add Railway deployment config, env docs, and production smoke checks

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/admin/package.json`
- Create: `apps/api/nixpacks.toml`
- Create: `apps/admin/nixpacks.toml`
- Modify: `apps/api/.env.example`
- Modify: `apps/admin/.env.example`
- Create: `docs/deployment/2026-03-16-zwibba-railway-production.md`
- Modify: `package.json`
- Modify: `scripts/smoke-monorepo.mjs`
- Create: `scripts/smoke-production-contracts.mjs`
- Create: `tests/railway-production-docs.test.mjs`

**Step 1: Write the failing deployment and smoke tests**

- Root smoke coverage should verify that API and admin expose Railway-ready build and start commands.
- Production docs should list every required Railway, Postgres, R2, and Twilio env variable.
- A dedicated smoke script should assert the presence of `/healthz`, the admin service env contract, and the expected production scripts.

**Step 2: Run the targeted checks to verify failure**

Run: `node --test tests/railway-production-docs.test.mjs`
Run: `node scripts/smoke-production-contracts.mjs`
Expected: FAIL because Railway deployment config and production docs do not exist yet.

**Step 3: Write the minimal implementation**

- Add production `build` and `start` scripts to API and admin.
- Add Railway-oriented `nixpacks.toml` files or equivalent pinned service build commands.
- Write a deployment runbook covering:
  - creating the Railway project
  - adding Postgres
  - creating API and admin services from this repo
  - setting all env variables
  - creating the Cloudflare R2 bucket
  - creating the Twilio Verify service SID
  - verifying the first deployment
- Extend root smoke checks with production contract assertions.

**Step 4: Run the targeted checks again**

Run: `node --test tests/railway-production-docs.test.mjs`
Run: `node scripts/smoke-production-contracts.mjs`
Run: `npm run smoke:monorepo`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api apps/admin package.json scripts tests docs/deployment
git commit -m "docs: add railway production deployment plan"
```

### Task 19: Verify the productionization branch end to end

**Files:**
- Modify as needed: files touched in Tasks 13-18

**Step 1: Run the complete verification set**

Run: `pnpm -C apps/api exec prisma validate`
Run: `pnpm -C apps/api test`
Run: `pnpm -C apps/api exec tsc --noEmit`
Run: `pnpm -C apps/admin test`
Run: `pnpm -C apps/admin exec tsc --noEmit`
Run: `sh -lc "cd apps/mobile && flutter test"`
Run: `npm test`
Run: `npm run smoke:monorepo`
Expected: PASS.

**Step 2: Execute the manual productionization checklist**

- Seller can request OTP against Twilio Verify test mode.
- Seller can restore a persisted session after app restart.
- Seller can create a draft with real uploaded photo metadata.
- Publish creates a persisted listing and moderation state.
- Admin queue shows pending moderation items from the database.
- Buyer browse/detail shows DB-backed published listings.
- Wallet and boost reflect persisted ledger state.

**Step 3: Commit any final cleanup**

```bash
git add apps/api apps/mobile apps/admin package.json scripts tests docs
git commit -m "chore: finalize productionization branch"
```
