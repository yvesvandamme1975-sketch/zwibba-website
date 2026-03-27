# Zwibba Internal Beta Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish Zwibba as a production-grade internal beta by adding resettable demo accounts, reliable full-app live E2E, and the final operational polish needed to test the whole app repeatedly.

**Architecture:** Keep the current Railway browser beta architecture intact: `/App` stays the live browser client, `apps/api` remains the single source of truth, and `apps/admin` remains the moderation surface. Add only the missing testability and operational layers: resettable demo identities, Playwright-based live acceptance flows, and runbook/smoke coverage that reflect the real deployed app.

**Tech Stack:** Static HTML/CSS/vanilla JS, Node test runner, Playwright, NestJS, Prisma, Railway, Railway Postgres, Cloudflare R2, demo OTP mode

---

### Task 1: Add the resettable demo-account env contract

**Files:**
- Modify: `apps/api/src/config/env.ts`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/test/config/env.test.ts`

**Step 1: Write the failing test**

Add env tests that expect:
- demo mode can define `DEMO_RESETTABLE_SELLER_PHONE`
- the resettable phone must be normalized and available on the loaded env object
- non-demo mode does not require that value

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- config`
Expected: FAIL because the env contract does not expose a resettable seller phone yet.

**Step 3: Write minimal implementation**

Update env loading to:
- accept an optional `DEMO_RESETTABLE_SELLER_PHONE`
- expose it only as demo-mode beta config
- document it in `.env.example`

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- config`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/config/env.ts apps/api/.env.example apps/api/test/config/env.test.ts
git commit -m "feat: add resettable demo seller env contract"
```

### Task 2: Add failing API tests for reset-on-verify behavior

**Files:**
- Modify: `apps/api/test/auth/demo-otp.e2e-spec.ts`

**Step 1: Write the failing test**

Add demo OTP tests that expect:
- verifying the resettable seller phone wipes prior mutable seller data
- wallet reseeds back to exactly one `Crédit bêta Zwibba` transaction
- previous seller-owned listings, boosts, sessions, and seller-side chat data for that phone do not survive the reset

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- demo-otp`
Expected: FAIL because demo verification currently only seeds the wallet once and never resets accumulated state.

**Step 3: Write minimal implementation scaffolding**

Add only the smallest shared test harness helpers needed to seed seller data for the reset tests. Do not implement production cleanup yet.

**Step 4: Run test to verify it still fails correctly**

Run: `pnpm -C apps/api test -- demo-otp`
Expected: FAIL because the reset behavior is still missing, but the test now expresses the correct end state.

**Step 5: Commit**

```bash
git add apps/api/test/auth/demo-otp.e2e-spec.ts
git commit -m "test: cover resettable demo seller verification"
```

### Task 3: Implement resettable single-demo-seller cleanup and wallet reseed

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/config/env.ts`
- Modify: `apps/api/test/auth/demo-otp.e2e-spec.ts`

**Step 1: Write the failing test**

Tighten the new demo OTP tests so they assert:
- reset runs only in demo mode
- reset runs only for the configured resettable seller phone
- the seller gets a fresh wallet seed after reset
- other allowlisted demo numbers are not wiped

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- demo-otp`
Expected: FAIL because the auth service does not yet reset seller state.

**Step 3: Write minimal implementation**

Update `AuthService` to:
- detect the resettable seller phone during demo verification
- delete prior sessions, wallet transactions, boosts, seller-owned drafts/listings/moderation decisions, and related chat threads/messages for that seller
- reseed exactly one beta wallet credit after reset
- preserve all other users and seeded marketplace content

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- demo-otp`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/config/env.ts apps/api/test/auth/demo-otp.e2e-spec.ts
git commit -m "feat: reset dedicated demo seller on verification"
```

### Task 4: Add a reusable Playwright helper for live Railway beta flows

**Files:**
- Create: `scripts/e2e/live-beta-helpers.mjs`
- Create: `tests/live-beta-helpers.test.mjs`
- Modify: `package.json`

**Step 1: Write the failing test**

Add Node tests that expect helper behavior for:
- classifying R2 upload outcomes from real postconditions instead of raw `requestfailed` noise
- waiting for image readiness on review/success/listing screens
- extracting canonical app routes from the live hash router

**Step 2: Run test to verify it fails**

Run: `node --test tests/live-beta-helpers.test.mjs`
Expected: FAIL because no helper module exists yet.

**Step 3: Write minimal implementation**

Create a small Playwright helper module that:
- opens the live `/App` URL
- tracks failed requests without failing immediately
- classifies R2 upload success from object reachability plus UI render state
- exposes reusable route/assertion helpers for seller, messaging, and moderation flows

**Step 4: Run test to verify it passes**

Run: `node --test tests/live-beta-helpers.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/e2e/live-beta-helpers.mjs tests/live-beta-helpers.test.mjs package.json
git commit -m "test: add live beta e2e helpers"
```

### Task 5: Add the canonical live seller-flow E2E

**Files:**
- Create: `scripts/e2e/internal-beta-seller-flow.mjs`
- Modify: `package.json`
- Modify: `docs/deployment/2026-03-16-zwibba-railway-production.md`

**Step 1: Write the failing test**

Create the seller E2E script so it asserts:
- resettable demo seller starts clean
- seller uploads real images
- review shows media and manual price only
- OTP verify succeeds
- publish succeeds
- success opens the new listing
- wallet and profile reflect the new listing and boost state

**Step 2: Run test to verify it fails**

Run: `node scripts/e2e/internal-beta-seller-flow.mjs`
Expected: FAIL until the resettable demo account and helper logic are both wired.

**Step 3: Write minimal implementation**

Implement the seller flow script using the shared helper module and add a root npm script such as:
- `test:e2e:seller:beta`

Update the Railway runbook with:
- the resettable seller phone
- demo OTP code
- real upload test asset path
- expected seller pass criteria

**Step 4: Run test to verify it passes**

Run: `node scripts/e2e/internal-beta-seller-flow.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/e2e/internal-beta-seller-flow.mjs package.json docs/deployment/2026-03-16-zwibba-railway-production.md
git commit -m "test: add live beta seller flow e2e"
```

### Task 6: Add the buyer-to-seller messaging E2E

**Files:**
- Create: `scripts/e2e/internal-beta-messaging-flow.mjs`
- Modify: `package.json`
- Modify: `docs/deployment/2026-03-16-zwibba-railway-production.md`

**Step 1: Write the failing test**

Create a live messaging E2E that expects:
- buyer can browse and open a listing
- `Envoyer un message` routes through demo OTP when needed
- thread opens inside `/App`
- buyer message sends
- seller sees the conversation and replies
- buyer sees the reply without manual refresh

**Step 2: Run test to verify it fails**

Run: `node scripts/e2e/internal-beta-messaging-flow.mjs`
Expected: FAIL because the canonical reusable messaging acceptance flow does not exist yet.

**Step 3: Write minimal implementation**

Implement the messaging E2E script and document:
- buyer demo number
- seller demo number
- expected thread route and reply behavior

Add a root npm script such as:
- `test:e2e:messages:beta`

**Step 4: Run test to verify it passes**

Run: `node scripts/e2e/internal-beta-messaging-flow.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/e2e/internal-beta-messaging-flow.mjs package.json docs/deployment/2026-03-16-zwibba-railway-production.md
git commit -m "test: add live beta messaging flow e2e"
```

### Task 7: Add the admin moderation round-trip E2E

**Files:**
- Create: `scripts/e2e/internal-beta-moderation-flow.mjs`
- Modify: `package.json`
- Modify: `docs/deployment/2026-03-16-zwibba-railway-production.md`

**Step 1: Write the failing test**

Create a live moderation E2E that expects:
- a pending-manual-review listing appears in admin
- admin approve moves it into buyer visibility
- admin block returns seller-facing blocked/fix state when appropriate

**Step 2: Run test to verify it fails**

Run: `node scripts/e2e/internal-beta-moderation-flow.mjs`
Expected: FAIL because the scripted moderation round-trip does not exist yet.

**Step 3: Write minimal implementation**

Implement the moderation E2E script and document:
- required admin secret setup
- listing category needed to hit `pending_manual_review`
- expected seller and buyer visibility changes after moderation

Add a root npm script such as:
- `test:e2e:moderation:beta`

**Step 4: Run test to verify it passes**

Run: `node scripts/e2e/internal-beta-moderation-flow.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/e2e/internal-beta-moderation-flow.mjs package.json docs/deployment/2026-03-16-zwibba-railway-production.md
git commit -m "test: add live beta moderation e2e"
```

### Task 8: Tighten internal-beta runbook and tester instructions

**Files:**
- Modify: `docs/deployment/2026-03-16-zwibba-railway-production.md`
- Create: `docs/deployment/2026-03-27-zwibba-internal-beta-testers.md`
- Modify: `scripts/smoke-production-contracts.mjs`
- Modify: `tests/railway-production-docs.test.mjs`

**Step 1: Write the failing test**

Add documentation/smoke tests that expect:
- the runbook lists internal beta URLs
- the runbook lists demo OTP mode and the resettable seller account contract
- a tester-facing doc exists with paths for seller, buyer, messages, wallet, boost, and moderation

**Step 2: Run test to verify it fails**

Run: `node --test tests/railway-production-docs.test.mjs`
Expected: FAIL because the current runbook does not yet cover internal-beta tester operations in full.

**Step 3: Write minimal implementation**

Update docs and smoke checks to cover:
- app, API, and admin URLs
- demo phone numbers and reset behavior
- seller, buyer, messaging, wallet, boost, and moderation test paths
- known limitations:
  - demo OTP only
  - no real payments
  - chat refresh is live-refresh, not websocket push

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/railway-production-docs.test.mjs`
- `node scripts/smoke-production-contracts.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add docs/deployment/2026-03-16-zwibba-railway-production.md docs/deployment/2026-03-27-zwibba-internal-beta-testers.md scripts/smoke-production-contracts.mjs tests/railway-production-docs.test.mjs
git commit -m "docs: add internal beta tester runbook"
```

### Task 9: Run final internal-beta acceptance and record known limits

**Files:**
- Modify: `docs/deployment/2026-03-27-zwibba-internal-beta-testers.md`

**Step 1: Write the failing test**

Add a final acceptance checklist section that is incomplete until the live scripts have all been run once from the current branch.

**Step 2: Run test to verify it fails**

Run:
- `npm run smoke:app`
- `npm run smoke:monorepo`
- `node scripts/e2e/internal-beta-seller-flow.mjs`
- `node scripts/e2e/internal-beta-messaging-flow.mjs`
- `node scripts/e2e/internal-beta-moderation-flow.mjs`

Expected: FAIL until all live flows and docs have been completed and checked.

**Step 3: Write minimal implementation**

Execute the full internal-beta acceptance run, then update the tester doc with:
- pass/fail status for each live flow
- the exact demo accounts used
- any remaining known limitations that testers should expect

**Step 4: Run test to verify it passes**

Run:
- `npm test`
- `npm run smoke:app`
- `npm run smoke:monorepo`
- `pnpm -C apps/api test`
- `pnpm -C apps/admin test`
- `node scripts/e2e/internal-beta-seller-flow.mjs`
- `node scripts/e2e/internal-beta-messaging-flow.mjs`
- `node scripts/e2e/internal-beta-moderation-flow.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add docs/deployment/2026-03-27-zwibba-internal-beta-testers.md
git commit -m "chore: finalize internal beta acceptance"
```

