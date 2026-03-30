# Zwibba Seller Listing Lifecycle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add seller lifecycle actions for published listings: pause, mark sold, soft-delete with 30-day restore, and relist, while preserving audit history and future stats.

**Architecture:** Extend `Listing` with lifecycle snapshot fields for fast reads and add an append-only `ListingLifecycleEvent` model for analytics. Keep moderation status separate from seller lifecycle. Surface lifecycle management in seller profile and seller-owned listing detail, while filtering buyer browse/detail to `approved + active` only.

**Tech Stack:** Browser `/App` JavaScript modules, NestJS API, Prisma/Postgres, Node test runner, Nest e2e tests, Railway deploys.

---

### Task 1: Add lifecycle persistence in Prisma

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_listing_lifecycle/migration.sql`
- Test: `apps/api/test/listings/seller-listings.e2e-spec.ts`

**Step 1: Write the failing test**

Add an API test case asserting seller listing payloads can include lifecycle fields such as:

- `lifecycleStatus`
- `deletedReason`
- `restoreUntil`
- `soldChannel`

Use a fixture listing with `moderationStatus: approved` and `lifecycleStatus: deleted_by_seller`.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C apps/api test -- seller-listings
```

Expected: FAIL because the Prisma schema and endpoint payload do not yet include lifecycle fields.

**Step 3: Write minimal implementation**

Update `schema.prisma`:

- add lifecycle snapshot fields to `Listing`
- add new `ListingLifecycleEvent` model

Create a migration that:

- backfills `Listing.lifecycleStatus = 'active'`
- leaves new nullable fields empty by default

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C apps/api exec prisma generate
pnpm -C apps/api test -- seller-listings
```

Expected: PASS for the new lifecycle fields.

**Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat: add listing lifecycle persistence"
```

### Task 2: Add seller lifecycle action endpoint

**Files:**
- Modify: `apps/api/src/listings/listings.controller.ts`
- Modify: `apps/api/src/listings/listings.service.ts`
- Create: `apps/api/src/listings/listing-lifecycle.ts`
- Test: `apps/api/test/listings/listing-lifecycle-actions.e2e-spec.ts`

**Step 1: Write the failing test**

Create e2e coverage for:

- `pause`
- `mark_sold` with required reason
- `delete` with required reason
- `restore` within 30 days
- `relist` from sold

Also verify invalid transitions fail:

- restore after 30 days
- relist from non-sold
- mark_sold without reason
- seller acting on another seller’s listing

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C apps/api test -- listing-lifecycle-actions
```

Expected: FAIL because the endpoint and transition logic do not exist.

**Step 3: Write minimal implementation**

Add:

- `POST /listings/:listingId/lifecycle`

Request shape:

```json
{
  "action": "delete",
  "reasonCode": "republish_later"
}
```

Implement transition helpers in `listing-lifecycle.ts`:

- validate allowed transitions
- derive labels
- derive `restoreUntil`
- produce snapshot updates
- produce lifecycle event insert payload

Persist:

- listing snapshot changes
- one `ListingLifecycleEvent` row per action

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C apps/api test -- listing-lifecycle-actions
pnpm -C apps/api exec tsc --noEmit
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/listings apps/api/test/listings/listing-lifecycle-actions.e2e-spec.ts
git commit -m "feat: add seller listing lifecycle actions"
```

### Task 3: Filter public listings and enrich seller listing payloads

**Files:**
- Modify: `apps/api/src/listings/listings.service.ts`
- Test: `apps/api/test/listings/listings.e2e-spec.ts`
- Test: `apps/api/test/listings/seller-listings.e2e-spec.ts`

**Step 1: Write the failing test**

Add/extend tests asserting:

- public `GET /listings` excludes `paused`, `sold`, and `deleted_by_seller`
- public `GET /listings/:slug` returns not found for non-active lifecycle states
- `GET /listings/mine` includes lifecycle metadata and action capability flags

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C apps/api test -- listings
pnpm -C apps/api test -- seller-listings
```

Expected: FAIL because browse/detail only check moderation, and seller payload lacks lifecycle data.

**Step 3: Write minimal implementation**

Update browse/detail filters to require:

- `moderationStatus = approved`
- `lifecycleStatus = active`

Enrich seller listing cards with:

- `lifecycleStatus`
- `lifecycleStatusLabel`
- `deletedReason`
- `soldChannel`
- `restoreUntil`
- `canRestore`
- `canRelist`
- `canPause`
- `canMarkSold`
- `canDelete`

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C apps/api test -- listings
pnpm -C apps/api test -- seller-listings
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/listings/listings.service.ts apps/api/test/listings
git commit -m "feat: expose listing lifecycle in public and seller queries"
```

### Task 4: Add browser seller lifecycle service and state wiring

**Files:**
- Modify: `App/services/seller-listings-service.mjs`
- Modify: `App/app.js`
- Create: `tests/seller-listing-lifecycle-service.test.mjs`
- Create: `tests/seller-listing-lifecycle-state.test.mjs`

**Step 1: Write the failing test**

Add service and state tests for:

- calling `POST /listings/:id/lifecycle`
- updating seller listings state after action success
- keeping chats/browse state consistent after delete, sold, restore, relist

**Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/seller-listing-lifecycle-service.test.mjs tests/seller-listing-lifecycle-state.test.mjs
```

Expected: FAIL because browser service methods and state handlers do not exist.

**Step 3: Write minimal implementation**

Extend `seller-listings-service.mjs` with:

- `applyLifecycleAction({ listingId, action, reasonCode, session })`

In `app.js` add:

- lifecycle action busy/error state
- handlers for owner actions
- refresh invalidation for seller listings and buyer feed
- confirmation modal flow using simple prompt/confirm first if no modal component exists yet

**Step 4: Run test to verify it passes**

Run:

```bash
node --test tests/seller-listing-lifecycle-service.test.mjs tests/seller-listing-lifecycle-state.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add App/services/seller-listings-service.mjs App/app.js tests/seller-listing-lifecycle-service.test.mjs tests/seller-listing-lifecycle-state.test.mjs
git commit -m "feat: wire seller lifecycle actions in app state"
```

### Task 5: Add seller management UI in profile

**Files:**
- Modify: `App/features/profile/profile-screen.mjs`
- Modify: `App/app.css`
- Test: `tests/profile-screen.test.mjs`

**Step 1: Write the failing test**

Add profile screen coverage for:

- segmented lifecycle buckets
- archived listing card metadata
- sold listing card metadata
- `Restaurer`
- `Remettre en vente`
- `Supprimer`
- `Marquer comme vendu`
- `Mettre en pause`

**Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/profile-screen.test.mjs
```

Expected: FAIL because the profile only renders one grid with `Voir` and `Booster`.

**Step 3: Write minimal implementation**

Update profile UI to:

- group listings by lifecycle
- render archive metadata
- render seller action buttons according to capability flags
- keep empty states explicit for each seller bucket

Add only the CSS needed for:

- segmented seller filters
- action button rows
- archived/sold badges

**Step 4: Run test to verify it passes**

Run:

```bash
node --test tests/profile-screen.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add App/features/profile/profile-screen.mjs App/app.css tests/profile-screen.test.mjs
git commit -m "feat: add seller lifecycle management to profile"
```

### Task 6: Add owner action card on in-app listing detail

**Files:**
- Modify: `App/features/listings/listing-detail-screen.mjs`
- Modify: `App/app.js`
- Test: `tests/listing-detail-screen.test.mjs`

**Step 1: Write the failing test**

Add detail-screen coverage for:

- seller-owned listing hides buyer CTAs
- owner action card appears
- sold listing shows `Remettre en vente`
- deleted listing owner view shows `Restaurer` when eligible

**Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/listing-detail-screen.test.mjs
```

Expected: FAIL because detail currently always renders buyer contact actions.

**Step 3: Write minimal implementation**

Pass session/owner context into detail rendering and:

- detect seller ownership
- render lifecycle badge and owner actions
- retain buyer mode for non-owner viewers

**Step 4: Run test to verify it passes**

Run:

```bash
node --test tests/listing-detail-screen.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add App/features/listings/listing-detail-screen.mjs App/app.js tests/listing-detail-screen.test.mjs
git commit -m "feat: add seller owner actions to listing detail"
```

### Task 7: Preserve chat behavior and finish full verification

**Files:**
- Modify: `App/features/chat/thread-screen.mjs` (only if unavailable banners are missing)
- Modify: `apps/api/src/chat/chat.service.ts` (only if thread/listing lifecycle metadata is needed)
- Test: `tests/messages-screen.test.mjs`
- Test: `apps/api/test/chat/chat.e2e-spec.ts`
- Doc: `docs/deployment/2026-03-16-zwibba-railway-production.md`

**Step 1: Write the failing test**

Add chat tests proving:

- threads remain readable when a listing is sold or deleted
- listing state banner appears in thread/inbox when applicable
- new public buyer contact is not possible once listing is inactive

**Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/messages-screen.test.mjs
pnpm -C apps/api test -- chat
```

Expected: FAIL if lifecycle state is not propagated.

**Step 3: Write minimal implementation**

Only if needed:

- expose lifecycle state in thread payloads
- render unavailable/sold/deleted banners

Update deployment doc with new seller lifecycle beta checks.

**Step 4: Run test to verify it passes**

Run:

```bash
node --test tests/messages-screen.test.mjs
pnpm -C apps/api test -- chat
npm run smoke:app
```

Expected: PASS.

**Step 5: Commit**

```bash
git add App/features/chat/thread-screen.mjs apps/api/src/chat/chat.service.ts tests/messages-screen.test.mjs apps/api/test/chat/chat.e2e-spec.ts docs/deployment/2026-03-16-zwibba-railway-production.md
git commit -m "feat: preserve chat context across listing lifecycle changes"
```

### Task 8: Live beta verification and deploy

**Files:**
- No new files required unless regressions are found

**Step 1: Run focused local suites**

Run:

```bash
node --test tests/profile-screen.test.mjs tests/listing-detail-screen.test.mjs tests/messages-screen.test.mjs tests/seller-listing-lifecycle-service.test.mjs tests/seller-listing-lifecycle-state.test.mjs
pnpm -C apps/api test -- listings
pnpm -C apps/api test -- seller-listings
pnpm -C apps/api test -- listing-lifecycle-actions
pnpm -C apps/api test -- chat
npm run smoke:app
```

Expected: all pass.

**Step 2: Deploy**

Run:

```bash
railway up --detach
railway deployment list
```

Expected: website/api deploys reach `SUCCESS`.

**Step 3: Run live beta checks**

Verify manually or with Playwright:

- seller pauses a listing
- seller deletes a listing
- seller restores a deleted listing inside 30 days
- seller marks a listing sold
- seller relists a sold listing
- buyer cannot browse deleted/paused/sold listings
- chats remain readable

**Step 4: Final commit if deployment-doc or smoke fixes were needed**

```bash
git add .
git commit -m "docs: finalize seller lifecycle rollout checks"
```
