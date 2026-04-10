# Zwibba Multi-Currency Listing Prices Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let each listing be priced in either `CDF` or `USD`, with the seller choosing the currency before entering a price, while keeping wallet and boost flows in `CDF`.

**Architecture:** Replace announcement-only `priceCdf` with `priceAmount + priceCurrency` on drafts and listings, migrate existing data to `CDF`, then update browser form entry, API validation, and price rendering across seller and buyer surfaces. Keep wallet formatting and balance logic untouched.

**Tech Stack:** Browser JS modules, NestJS API, Prisma/Postgres, Node test runner, TypeScript, Railway deploys.

---

### Task 1: Add the failing browser tests for currency-first seller pricing

**Files:**
- Modify: `tests/post-flow.test.mjs`
- Modify: `tests/price-input.test.mjs`
- Modify: `tests/listing-detail-screen.test.mjs`
- Modify: `tests/profile-screen.test.mjs`

**Step 1: Write the failing tests**

Add coverage for:
- review form disables price input until a currency is selected
- review form renders `Devise` with `CDF` and `US$`
- price helper changes between `450 000 CDF` and `350 US$`
- listing detail renders `US$` correctly
- seller profile listing cards render either currency correctly

**Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/post-flow.test.mjs tests/price-input.test.mjs tests/listing-detail-screen.test.mjs tests/profile-screen.test.mjs
```

Expected: FAIL on missing currency selector, missing USD rendering, and old `priceCdf` assumptions.

**Step 3: Commit**

```bash
git add tests/post-flow.test.mjs tests/price-input.test.mjs tests/listing-detail-screen.test.mjs tests/profile-screen.test.mjs
git commit -m "test: cover multi-currency listing prices in browser"
```

### Task 2: Add the failing API and migration tests

**Files:**
- Modify: `apps/api/test/drafts/drafts-persistence.e2e-spec.ts`
- Modify: `apps/api/test/listings/listings.e2e-spec.ts`
- Modify: `apps/api/test/moderation/publish-outcome.e2e-spec.ts`
- Create: `apps/api/test/common/listing-price-format.test.ts`

**Step 1: Write the failing tests**

Add coverage for:
- draft sync accepts `priceAmount` + `priceCurrency`
- publish accepts `USD`
- listing feed/detail return amount + currency
- migrated old data still renders as `CDF`

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm -C apps/api test -- drafts-persistence
pnpm -C apps/api test -- listings/listings.e2e-spec.ts
pnpm -C apps/api test -- publish-outcome
```

Expected: FAIL because the API still expects `priceCdf`.

**Step 3: Commit**

```bash
git add apps/api/test/drafts/drafts-persistence.e2e-spec.ts apps/api/test/listings/listings.e2e-spec.ts apps/api/test/moderation/publish-outcome.e2e-spec.ts apps/api/test/common/listing-price-format.test.ts
git commit -m "test: cover multi-currency listing prices in api"
```

### Task 3: Migrate the database model from `priceCdf` to `priceAmount + priceCurrency`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/YYYYMMDDHHMMSS_listing_price_currency/migration.sql`

**Step 1: Write the migration**

Change both `Draft` and `Listing`:
- add `priceAmount Int`
- add `priceCurrency String @default("CDF")`
- backfill:
  - `priceAmount = priceCdf`
  - `priceCurrency = 'CDF'`
- remove `priceCdf`

**Step 2: Run Prisma generation**

Run:

```bash
pnpm -C apps/api exec prisma generate
```

Expected: PASS with updated client.

**Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat: migrate listings and drafts to amount plus currency"
```

### Task 4: Add shared listing-price formatting and parsing helpers

**Files:**
- Modify: `App/utils/price-input.mjs`
- Modify: `App/utils/rendering.mjs`
- Create if needed: `apps/api/src/common/listing-price.ts`

**Step 1: Implement browser helpers**

Add browser utilities for:
- normalizing digits
- parsing integer price from raw input
- formatting listing preview for `CDF` and `US$`

**Step 2: Implement shared display formatter**

Add a formatter that accepts:

```js
formatListingPrice({ amount, currency })
```

Expected output:
- `450 000 CDF`
- `350 US$`

**Step 3: Run targeted tests**

Run:

```bash
node --test tests/price-input.test.mjs
```

Expected: PASS.

**Step 4: Commit**

```bash
git add App/utils/price-input.mjs App/utils/rendering.mjs apps/api/src/common/listing-price.ts
git commit -m "feat: add shared listing price formatting helpers"
```

### Task 5: Update browser draft model and seller review flow

**Files:**
- Modify: `App/models/listing-draft.mjs`
- Modify: `App/features/post/review-form-screen.mjs`
- Modify: `App/features/post/post-flow-controller.mjs`
- Modify: `App/app.js`
- Modify: `tests/review-draft-render-state.test.mjs`

**Step 1: Replace draft pricing shape**

Move draft details from:
- `priceCdf`

to:
- `priceAmount`
- `priceCurrency`

**Step 2: Update review form**

Render:
- `Devise` selector
- disabled price field until currency is chosen
- currency-aware helper/placeholder

**Step 3: Update submit and live preview logic**

Submit:
- `priceAmount`
- `priceCurrency`

Keep:
- same validation flow
- integer-only parsing

**Step 4: Run targeted tests**

Run:

```bash
node --test tests/post-flow.test.mjs tests/review-draft-render-state.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add App/models/listing-draft.mjs App/features/post/review-form-screen.mjs App/features/post/post-flow-controller.mjs App/app.js tests/review-draft-render-state.test.mjs
git commit -m "feat: add per-listing currency selection in review flow"
```

### Task 6: Update browser services and payload contracts

**Files:**
- Modify: `App/services/live-draft-service.mjs`
- Modify: `App/services/listings-service.mjs`
- Modify: `App/services/seller-listings-service.mjs`
- Modify: `tests/app-live-api.test.mjs`
- Modify: `tests/listings-live-api.test.mjs`

**Step 1: Update draft sync payload**

Send:
- `priceAmount`
- `priceCurrency`

Read the same fields back into browser draft state.

**Step 2: Update listing payload handling**

Consume the new amount/currency fields for buyer and seller surfaces.

**Step 3: Run targeted tests**

Run:

```bash
node --test tests/app-live-api.test.mjs tests/listings-live-api.test.mjs
```

Expected: PASS.

**Step 4: Commit**

```bash
git add App/services/live-draft-service.mjs App/services/listings-service.mjs App/services/seller-listings-service.mjs tests/app-live-api.test.mjs tests/listings-live-api.test.mjs
git commit -m "feat: switch browser api contracts to amount plus currency"
```

### Task 7: Update API draft and moderation flows

**Files:**
- Modify: `apps/api/src/drafts/drafts.controller.ts`
- Modify: `apps/api/src/drafts/drafts.service.ts`
- Modify: `apps/api/src/moderation/moderation.controller.ts`
- Modify: `apps/api/src/moderation/moderation.service.ts`
- Modify: `apps/api/src/common/price-validation.ts`

**Step 1: Replace request/response price fields**

Controllers and services should now accept and return:
- `priceAmount`
- `priceCurrency`

**Step 2: Update validation**

Validate:
- supported currency
- positive integer amount
- current integer-safe bounds

Do not convert currencies.

**Step 3: Run targeted tests**

Run:

```bash
pnpm -C apps/api test -- drafts-persistence
pnpm -C apps/api test -- publish-outcome
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/api/src/drafts/drafts.controller.ts apps/api/src/drafts/drafts.service.ts apps/api/src/moderation/moderation.controller.ts apps/api/src/moderation/moderation.service.ts apps/api/src/common/price-validation.ts
git commit -m "feat: add currency-aware draft and publish validation"
```

### Task 8: Update listing feed, detail, profile, success, and publish summary rendering

**Files:**
- Modify: `App/features/home/recent-feed-section.mjs`
- Modify: `App/features/listings/listing-detail-screen.mjs`
- Modify: `App/features/profile/profile-screen.mjs`
- Modify: `App/features/post/success-screen.mjs`
- Modify: `App/features/post/publish-gate-screen.mjs`
- Modify: `apps/api/src/listings/listings.service.ts`

**Step 1: Switch listing summaries and detail payloads**

Replace listing announcement rendering from `priceCdf` to:
- `priceAmount`
- `priceCurrency`

**Step 2: Keep wallet untouched**

Do not refactor:
- `wallet-screen.mjs`
- wallet balances
- boost purchase amounts

They remain CDF-only.

**Step 3: Run targeted tests**

Run:

```bash
node --test tests/app-buyer-home.test.mjs tests/listing-detail-screen.test.mjs tests/profile-screen.test.mjs
pnpm -C apps/api test -- listings/listings.e2e-spec.ts
```

Expected: PASS.

**Step 4: Commit**

```bash
git add App/features/home/recent-feed-section.mjs App/features/listings/listing-detail-screen.mjs App/features/profile/profile-screen.mjs App/features/post/success-screen.mjs App/features/post/publish-gate-screen.mjs apps/api/src/listings/listings.service.ts
git commit -m "feat: render listing prices with per-listing currency"
```

### Task 9: Update seeded listing definitions and static content to the new shape

**Files:**
- Modify: `apps/api/src/listings/system-seeded-listings.ts`
- Modify: `src/site/content.mjs`
- Modify: `App/demo-content.mjs`
- Modify: any tests that still assume `priceCdf`

**Step 1: Convert starters and static samples**

Move seed/static content to:
- `priceAmount`
- `priceCurrency`

Use:
- `CDF` for existing local-price examples
- only add `USD` where intentionally useful later

**Step 2: Run targeted tests**

Run:

```bash
pnpm -C apps/api test -- system-seeded-listings
node --test tests/build.test.mjs tests/app-buyer-home.test.mjs
```

Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/listings/system-seeded-listings.ts src/site/content.mjs App/demo-content.mjs tests/build.test.mjs tests/app-buyer-home.test.mjs
git commit -m "chore: align seeded listings with multi-currency prices"
```

### Task 10: Full verification, deploy, and live checks

**Files:**
- No new code expected

**Step 1: Run the full verification set**

Run:

```bash
node --test tests/post-flow.test.mjs tests/price-input.test.mjs tests/listing-detail-screen.test.mjs tests/profile-screen.test.mjs tests/app-buyer-home.test.mjs
pnpm -C apps/api test -- drafts-persistence
pnpm -C apps/api test -- publish-outcome
pnpm -C apps/api test -- listings/listings.e2e-spec.ts
pnpm -C apps/api test -- system-seeded-listings
pnpm -C apps/api exec prisma generate
pnpm -C apps/api exec tsc --noEmit
npm run smoke:app
```

Expected: all green.

**Step 2: Deploy**

Deploy API and website after verification passes.

**Step 3: Live checks**

Verify on production:
- seller can publish one listing in `CDF`
- seller can publish another listing in `US$`
- both show correctly in profile and buyer feed
- wallet and boosts still display in `CDF`

**Step 4: Commit**

```bash
git status --short
```

Expected: clean worktree after deploy-ready verification.
