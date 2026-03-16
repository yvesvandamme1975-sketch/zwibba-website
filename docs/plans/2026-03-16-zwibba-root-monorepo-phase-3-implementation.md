# Zwibba Root Monorepo Phase 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the remaining v1 product flows in `/Users/pc/zwibba-website` now that the monorepo foundation, seller shell, minimal API contracts, admin shell, and root bootstrap scripts are in place.

**Architecture:** Keep `/App` as the browser-first UX reference, but implement the real product only in `apps/mobile`, `apps/api`, and `apps/admin`. Extend the existing in-memory API contracts incrementally, wire the Flutter app to those contracts, and keep the current marketing website and static browse/detail pages untouched except where they are used as copy or fixture references.

**Tech Stack:** Flutter 3, NestJS 11, minimal TypeScript admin shell, PNPM workspaces, Node-based smoke checks, existing static website build.

---

### Task 8: Connect the real Flutter seller flow to the current API contracts

**Files:**
- Modify: `apps/mobile/pubspec.yaml`
- Create: `apps/mobile/lib/config/api_base_url.dart`
- Create: `apps/mobile/lib/models/listing_draft.dart`
- Create: `apps/mobile/lib/services/api_client.dart`
- Create: `apps/mobile/lib/services/auth_api_service.dart`
- Create: `apps/mobile/lib/services/draft_api_service.dart`
- Create: `apps/mobile/lib/services/ai_draft_api_service.dart`
- Modify: `apps/mobile/lib/app.dart`
- Modify: `apps/mobile/lib/features/post/camera_screen.dart`
- Modify: `apps/mobile/lib/features/post/review_form_screen.dart`
- Modify: `apps/mobile/lib/features/auth/phone_input_screen.dart`
- Modify: `apps/mobile/lib/features/auth/otp_screen.dart`
- Create: `apps/mobile/test/services/auth_api_service_test.dart`
- Create: `apps/mobile/test/services/draft_api_service_test.dart`
- Create: `apps/mobile/test/services/ai_draft_api_service_test.dart`
- Modify: `apps/mobile/test/features/post/post_flow_test.dart`
- Modify: `apps/mobile/test/features/auth/publish_gate_test.dart`

**Step 1: Write the failing Flutter and service tests**

- API auth service requests OTP and verifies the deterministic seller session payload.
- API AI draft service maps `/ai/draft` into the Flutter draft model.
- Verified seller publish flow syncs the draft through `/drafts/sync` instead of stopping at a snackbar.

**Step 2: Run the targeted tests to verify failure**

Run: `flutter test test/services/auth_api_service_test.dart test/services/draft_api_service_test.dart test/services/ai_draft_api_service_test.dart test/features/post/post_flow_test.dart test/features/auth/publish_gate_test.dart`
Expected: FAIL because the Flutter app still uses local-only placeholder state and has no API client layer.

**Step 3: Write the minimal implementation**

- Add a small HTTP client wrapper with a configurable base URL for the local API.
- Move the current ad hoc draft shape out of `app.dart` into a reusable model.
- Call `/ai/draft` after the first capture preset is chosen.
- Call `/auth/request-otp` and `/auth/verify-otp` during the OTP flow.
- Call `/drafts/sync` once verification succeeds and before the seller reaches the publish confirmation state.

**Step 4: Run the targeted tests again**

Run: `flutter test test/services/auth_api_service_test.dart test/services/draft_api_service_test.dart test/services/ai_draft_api_service_test.dart test/features/post/post_flow_test.dart test/features/auth/publish_gate_test.dart`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/mobile
git commit -m "feat: connect mobile seller flow to api contracts"
```

### Task 9: Close the seller publish loop with moderation outcomes and share states

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/drafts/drafts.controller.ts`
- Modify: `apps/api/src/drafts/drafts.service.ts`
- Create: `apps/api/src/moderation/moderation.module.ts`
- Create: `apps/api/src/moderation/moderation.controller.ts`
- Create: `apps/api/src/moderation/moderation.service.ts`
- Create: `apps/api/test/moderation/publish-outcome.e2e-spec.ts`
- Modify: `apps/mobile/lib/app.dart`
- Create: `apps/mobile/lib/features/post/publish_success_screen.dart`
- Create: `apps/mobile/lib/features/post/publish_pending_screen.dart`
- Create: `apps/mobile/lib/features/post/publish_blocked_screen.dart`
- Create: `apps/mobile/test/features/post/publish_outcome_test.dart`
- Modify: `apps/mobile/test/features/auth/publish_gate_test.dart`
- Modify: `apps/admin/src/main.ts`
- Modify: `apps/admin/src/moderation/moderation-page.ts`
- Modify: `apps/admin/test/moderation-page.test.ts`

**Step 1: Write the failing API, Flutter, and admin tests**

- Publishing a synced draft returns one of the deterministic moderation outcomes: `approved`, `pending_manual_review`, or `blocked_needs_fix`.
- The Flutter seller flow routes to a success, pending-review, or blocked screen based on the publish response.
- The admin queue renders API-shaped moderation items with the same status labels used by the publish endpoint.

**Step 2: Run the targeted tests to verify failure**

Run: `pnpm -C apps/api test -- publish-outcome`
Run: `flutter test test/features/post/publish_outcome_test.dart test/features/auth/publish_gate_test.dart`
Run: `pnpm -C apps/admin test -- moderation`
Expected: FAIL because the publish endpoint and Flutter/admin outcome states do not exist yet.

**Step 3: Write the minimal implementation**

- Add a `/moderation/publish` endpoint that accepts a synced draft payload and returns a deterministic moderation result.
- Add a `/moderation/queue` endpoint returning pending-review items for the admin shell.
- Replace the Flutter publish snackbar with real publish requests and route to outcome screens.
- Keep the first implementation deterministic, for example:
  - `phones_tablets` and `electronics` default to `approved`
  - missing-sensitive metadata returns `blocked_needs_fix`
  - `vehicles` and `real_estate` can return `pending_manual_review`

**Step 4: Run the targeted tests again**

Run: `pnpm -C apps/api test -- publish-outcome`
Run: `flutter test test/features/post/publish_outcome_test.dart test/features/auth/publish_gate_test.dart`
Run: `pnpm -C apps/admin test -- moderation`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api apps/mobile apps/admin
git commit -m "feat: add publish moderation outcomes"
```

### Task 10: Add the buyer browse and listing-detail flows in the real app and API

**Files:**
- Create: `apps/api/src/listings/listings.module.ts`
- Create: `apps/api/src/listings/listings.controller.ts`
- Create: `apps/api/src/listings/listings.service.ts`
- Create: `apps/api/test/listings/listings.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/mobile/lib/app.dart`
- Create: `apps/mobile/lib/features/browse/browse_screen.dart`
- Create: `apps/mobile/lib/features/listings/listing_detail_screen.dart`
- Create: `apps/mobile/lib/features/listings/contact_actions_sheet.dart`
- Create: `apps/mobile/lib/services/listings_api_service.dart`
- Create: `apps/mobile/test/features/browse/browse_screen_test.dart`
- Create: `apps/mobile/test/features/listings/listing_detail_screen_test.dart`
- Create: `apps/mobile/test/services/listings_api_service_test.dart`

**Step 1: Write the failing API and Flutter tests**

- Listings endpoint returns a browse feed with category, price, location, and slug.
- Listing detail endpoint returns title, seller, safety tips, and contact actions.
- Flutter browse screen renders the feed and opens the listing-detail flow with contact actions.

**Step 2: Run the targeted tests to verify failure**

Run: `pnpm -C apps/api test -- listings`
Run: `flutter test test/services/listings_api_service_test.dart test/features/browse/browse_screen_test.dart test/features/listings/listing_detail_screen_test.dart`
Expected: FAIL because browse/detail APIs and Flutter buyer screens do not exist yet.

**Step 3: Write the minimal implementation**

- Add `/listings` and `/listings/:slug` endpoints with deterministic fixture data aligned to the existing website listing copy in `src/site/content.mjs`.
- Introduce a simple app-level navigation shell so the Flutter app can move between seller home and buyer browse/detail.
- Keep contact actions limited to WhatsApp, SMS, and call intents or placeholders, matching the website detail pages.

**Step 4: Run the targeted tests again**

Run: `pnpm -C apps/api test -- listings`
Run: `flutter test test/services/listings_api_service_test.dart test/features/browse/browse_screen_test.dart test/features/listings/listing_detail_screen_test.dart`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api apps/mobile
git commit -m "feat: add buyer browse and detail flows"
```

### Task 11: Add the minimal chat inbox and profile flows

**Files:**
- Create: `apps/api/src/chat/chat.module.ts`
- Create: `apps/api/src/chat/chat.controller.ts`
- Create: `apps/api/src/chat/chat.service.ts`
- Create: `apps/api/test/chat/chat.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/mobile/lib/app.dart`
- Create: `apps/mobile/lib/features/chat/inbox_screen.dart`
- Create: `apps/mobile/lib/features/chat/thread_screen.dart`
- Create: `apps/mobile/lib/features/profile/profile_screen.dart`
- Create: `apps/mobile/lib/services/chat_api_service.dart`
- Create: `apps/mobile/test/features/chat/inbox_screen_test.dart`
- Create: `apps/mobile/test/features/chat/thread_screen_test.dart`
- Create: `apps/mobile/test/features/profile/profile_screen_test.dart`
- Create: `apps/mobile/test/services/chat_api_service_test.dart`

**Step 1: Write the failing API and Flutter tests**

- Chat list endpoint returns at least one thread associated with a listing.
- Chat send endpoint appends a message to a thread.
- Flutter inbox and thread screens render the conversation and the profile screen remains reachable from the main app shell.

**Step 2: Run the targeted tests to verify failure**

Run: `pnpm -C apps/api test -- chat`
Run: `flutter test test/services/chat_api_service_test.dart test/features/chat/inbox_screen_test.dart test/features/chat/thread_screen_test.dart test/features/profile/profile_screen_test.dart`
Expected: FAIL because chat/profile are not implemented yet.

**Step 3: Write the minimal implementation**

- Add in-memory chat fixtures keyed by listing and phone number.
- Return a deterministic inbox list and thread detail payload from the API.
- Add minimal Flutter inbox, thread, and profile screens inside the same root navigation shell introduced in Task 10.

**Step 4: Run the targeted tests again**

Run: `pnpm -C apps/api test -- chat`
Run: `flutter test test/services/chat_api_service_test.dart test/features/chat/inbox_screen_test.dart test/features/chat/thread_screen_test.dart test/features/profile/profile_screen_test.dart`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api apps/mobile
git commit -m "feat: add chat and profile flows"
```

### Task 12: Add wallet, one simple boost flow, and final monorepo product smoke checks

**Files:**
- Create: `apps/api/src/wallet/wallet.module.ts`
- Create: `apps/api/src/wallet/wallet.controller.ts`
- Create: `apps/api/src/wallet/wallet.service.ts`
- Create: `apps/api/src/boost/boost.module.ts`
- Create: `apps/api/src/boost/boost.controller.ts`
- Create: `apps/api/src/boost/boost.service.ts`
- Create: `apps/api/test/wallet/wallet.e2e-spec.ts`
- Create: `apps/api/test/boost/boost.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/mobile/lib/app.dart`
- Create: `apps/mobile/lib/features/wallet/wallet_screen.dart`
- Create: `apps/mobile/lib/features/boost/boost_offer_sheet.dart`
- Create: `apps/mobile/lib/services/wallet_api_service.dart`
- Create: `apps/mobile/test/features/wallet/wallet_screen_test.dart`
- Create: `apps/mobile/test/features/boost/boost_offer_sheet_test.dart`
- Create: `apps/mobile/test/services/wallet_api_service_test.dart`
- Modify: `package.json`
- Modify: `scripts/smoke-monorepo.mjs`

**Step 1: Write the failing API, Flutter, and root smoke tests**

- Wallet endpoint returns a balance and transaction list.
- Boost endpoint accepts a listing and returns a deterministic promoted state.
- Flutter wallet screen renders balance history and the boost entry point is reachable from a seller-owned listing.
- Root smoke script verifies website compatibility plus mobile/API/admin test bootstraps.

**Step 2: Run the targeted tests to verify failure**

Run: `pnpm -C apps/api test -- wallet`
Run: `pnpm -C apps/api test -- boost`
Run: `flutter test test/services/wallet_api_service_test.dart test/features/wallet/wallet_screen_test.dart test/features/boost/boost_offer_sheet_test.dart`
Run: `node scripts/smoke-monorepo.mjs`
Expected: FAIL because wallet/boost flows and the stronger product smoke checks do not exist yet.

**Step 3: Write the minimal implementation**

- Add in-memory wallet and boost endpoints to the API.
- Add minimal Flutter wallet and boost UI using the existing green/white/dark-grey design system.
- Extend the monorepo smoke script so it verifies:
  - website still builds
  - workspaces still exist
  - API tests can run
  - admin tests can run
  - mobile tests can run

**Step 4: Run the targeted tests again**

Run: `pnpm -C apps/api test -- wallet`
Run: `pnpm -C apps/api test -- boost`
Run: `flutter test test/services/wallet_api_service_test.dart test/features/wallet/wallet_screen_test.dart test/features/boost/boost_offer_sheet_test.dart`
Run: `node scripts/smoke-monorepo.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api apps/mobile package.json scripts
git commit -m "feat: add wallet and boost flows"
```
