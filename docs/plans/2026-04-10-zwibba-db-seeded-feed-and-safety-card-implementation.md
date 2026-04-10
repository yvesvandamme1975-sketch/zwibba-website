# Zwibba DB-Seeded Feed And Safety Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move starter listings for underrepresented categories into the production database, mark them as `system_seed`, expose them through the normal `/listings` API feed, and redesign listing-detail safety tips into a compact orange warning card.

**Architecture:** Add `sourceType` to `Listing`, implement a re-runnable DB seed script that uses deterministic records and bundled image URLs, and keep the buyer feed as a single DB-backed path. Refactor listing-detail safety UI and extend photo/safety guidance for the new categories without changing the publish requirement of one primary photo.

**Tech Stack:** Prisma/Postgres, NestJS API, Node scripts with `tsx`, browser `/App` modules, Node test runner, Nest e2e tests, Railway deploy + runtime seed execution.

---

### Task 1: Add listing source type persistence

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_listing_source_type/migration.sql`
- Test: `apps/api/test/listings/listings.e2e-spec.ts`

**Step 1: Write the failing test**

Extend listing feed coverage to include a listing fixture with `sourceType: 'system_seed'` and assert the field can exist without breaking the public feed payload.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C apps/api test -- listings/listings.e2e-spec.ts
```

Expected: FAIL because `Listing.sourceType` is not present in Prisma yet.

**Step 3: Write minimal implementation**

Update `schema.prisma`:

- add `sourceType String @default("user")` to `Listing`

Create migration SQL:

- `ALTER TABLE "Listing" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'user';`

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C apps/api exec prisma generate
pnpm -C apps/api test -- listings/listings.e2e-spec.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat: add listing source type"
```

### Task 2: Build a reusable starter-listing seed helper

**Files:**
- Create: `apps/api/src/listings/system-seeded-listings.ts`
- Create: `apps/api/test/listings/system-seeded-listings.test.ts`

**Step 1: Write the failing test**

Add tests that:

- generate deterministic seed payloads for the approved starter slugs
- mark all seeded listings with `sourceType = system_seed`
- preserve one primary uploaded photo URL per listing
- produce the same identifiers when run twice

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C apps/api test -- system-seeded-listings
```

Expected: FAIL because the helper does not exist.

**Step 3: Write minimal implementation**

Create a helper that:

- imports listing content from `src/site/content.mjs`
- imports bundled image URLs from `shared/listing-images.mjs`
- filters the target starter categories
- emits deterministic ids:
  - `seed_draft_<slug>`
  - `seed_photo_<slug>`
  - `seed_listing_<slug>`
- assigns deterministic owner phone numbers for seed records
- assigns `sourceType = 'system_seed'`

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C apps/api test -- system-seeded-listings
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/listings/system-seeded-listings.ts apps/api/test/listings/system-seeded-listings.test.ts
git commit -m "feat: add system starter listing seed helper"
```

### Task 3: Add the re-runnable DB seed script

**Files:**
- Create: `apps/api/scripts/seed-system-listings.mjs`
- Modify: `apps/api/package.json`
- Test: `apps/api/test/listings/system-seeded-listings.test.ts`

**Step 1: Write the failing test**

Extend the helper test or add a new one proving the seed logic is idempotent:

- first run creates records
- second run updates without duplication

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C apps/api test -- system-seeded-listings
```

Expected: FAIL because there is no executable seed flow yet.

**Step 3: Write minimal implementation**

Create `seed-system-listings.mjs` that:

- instantiates PrismaClient
- upserts seed `Draft`, `DraftPhoto`, and `Listing` rows for each starter
- preserves:
  - `moderationStatus = approved`
  - `lifecycleStatus = active`
  - `sourceType = system_seed`
- logs a concise summary

Add package script:

```json
"seed:system-listings": "tsx scripts/seed-system-listings.mjs"
```

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C apps/api test -- system-seeded-listings
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/scripts/seed-system-listings.mjs apps/api/package.json
git commit -m "feat: add rerunnable system listing seed script"
```

### Task 4: Keep the normal listings feed DB-backed

**Files:**
- Modify: `apps/api/src/listings/listings.service.ts`
- Test: `apps/api/test/listings/listings.e2e-spec.ts`

**Step 1: Write the failing test**

Add feed coverage verifying that DB-backed `system_seed` listings appear in `GET /listings` like normal approved active listings.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C apps/api test -- listings/listings.e2e-spec.ts
```

Expected: FAIL if the feed mapping or fixture types ignore the new field.

**Step 3: Write minimal implementation**

Update listing types/mappers only as needed so the new `sourceType` field does not break public feed/detail behavior. Keep the feed source entirely in the database layer.

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C apps/api test -- listings/listings.e2e-spec.ts
pnpm -C apps/api exec tsc --noEmit
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/listings/listings.service.ts apps/api/test/listings/listings.e2e-spec.ts
git commit -m "feat: support system starter listings in DB feed"
```

### Task 5: Extend photo guidance for the new categories

**Files:**
- Modify: `App/models/category-guidance.mjs`
- Modify: `App/features/post/post-flow-controller.mjs`
- Test: `tests/post-flow.test.mjs`

**Step 1: Write the failing test**

Add browser tests asserting:

- `food` shows optional prompts for overall view and packaging/label
- `agriculture` shows optional prompts for overall view and equipment condition
- `construction` shows optional prompts for overall view and material detail
- `education` shows optional prompts for overall view and full lot
- `sports_leisure` shows optional prompts for overall view and material detail

**Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/post-flow.test.mjs
```

Expected: FAIL because guidance for the new categories is still generic.

**Step 3: Write minimal implementation**

Extend `categoryGuidance` and `promptLabels` with the new optional prompts while keeping `required: []` for these categories.

**Step 4: Run test to verify it passes**

Run:

```bash
node --test tests/post-flow.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add App/models/category-guidance.mjs App/features/post/post-flow-controller.mjs tests/post-flow.test.mjs
git commit -m "feat: add guidance prompts for new categories"
```

### Task 6: Specialize category safety tips in the API

**Files:**
- Modify: `apps/api/src/listings/listings.service.ts`
- Test: `apps/api/test/listings/listings.e2e-spec.ts`

**Step 1: Write the failing test**

Add assertions that listing detail returns category-specific safety tips for:

- `food`
- `agriculture`
- `construction`
- `education`
- `sports_leisure`

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C apps/api test -- listings/listings.e2e-spec.ts
```

Expected: FAIL because the service still uses generic fallback tips for these categories.

**Step 3: Write minimal implementation**

Update `buildSafetyTips(categoryId)` with short category-specific tips:

- `food`
- `agriculture`
- `construction`
- `education`
- `sports_leisure`

Keep each category to two concise tips.

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C apps/api test -- listings/listings.e2e-spec.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/listings/listings.service.ts apps/api/test/listings/listings.e2e-spec.ts
git commit -m "feat: specialize safety tips for new categories"
```

### Task 7: Redesign safety tips as one orange warning card

**Files:**
- Modify: `App/features/listings/listing-detail-screen.mjs`
- Modify: `App/app.css`
- Test: `tests/listing-detail-screen.test.mjs`

**Step 1: Write the failing test**

Update listing detail tests to require:

- one safety warning card
- `Attention` label
- compact warning copy
- no repeated `app-home__listing-card` rendering for safety tips

**Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/listing-detail-screen.test.mjs
```

Expected: FAIL because safety tips still render as standard listing cards.

**Step 3: Write minimal implementation**

Refactor the safety section to:

- use one dedicated wrapper
- render an icon + `Attention`
- render a short heading and up to two tips

Add CSS for:

- orange border/background
- smaller type
- compact spacing

**Step 4: Run test to verify it passes**

Run:

```bash
node --test tests/listing-detail-screen.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add App/features/listings/listing-detail-screen.mjs App/app.css tests/listing-detail-screen.test.mjs
git commit -m "feat: redesign listing safety tips as warning card"
```

### Task 8: Document the new plan and expose it in the plans index

**Files:**
- Create: `docs/plans/2026-04-10-zwibba-db-seeded-feed-and-safety-card-design.md`
- Create: `docs/plans/2026-04-10-zwibba-db-seeded-feed-and-safety-card-implementation.md`
- Modify: `docs/plans/README.md`

**Step 1: Write the files**

Save the validated design and implementation plan, then add both filenames to the plans index.

**Step 2: Commit**

```bash
git add docs/plans/2026-04-10-zwibba-db-seeded-feed-and-safety-card-design.md docs/plans/2026-04-10-zwibba-db-seeded-feed-and-safety-card-implementation.md docs/plans/README.md
git commit -m "docs: add DB seeded feed and safety card plans"
```

### Task 9: Run the full verification set

**Files:**
- No code changes unless a failing test reveals an issue

**Step 1: Run targeted browser tests**

```bash
node --test tests/post-flow.test.mjs tests/listing-detail-screen.test.mjs
```

Expected: PASS.

**Step 2: Run targeted API tests**

```bash
pnpm -C apps/api test -- system-seeded-listings
pnpm -C apps/api test -- listings/listings.e2e-spec.ts
pnpm -C apps/api exec prisma generate
pnpm -C apps/api exec tsc --noEmit
```

Expected: PASS.

**Step 3: Run app smoke**

```bash
npm run smoke:app
```

Expected: PASS.

### Task 10: Deploy and seed production

**Files:**
- No code changes unless deploy notes need updates

**Step 1: Deploy API**

```bash
railway up /Users/pc/zwibba-website-worktrees/browser-live/apps/api --path-as-root -s api -d -m "feat: add DB starter listings and safety card"
```

Expected: deployment reaches `SUCCESS`.

**Step 2: Deploy website**

```bash
railway up /Users/pc/zwibba-website-worktrees/browser-live --path-as-root -s website -d -m "feat: add DB starter listings and safety card"
```

Expected: deployment reaches `SUCCESS`.

**Step 3: Run seed script against production**

```bash
railway run -s api -- bash -lc 'cd apps/api && npm run seed:system-listings'
```

Expected: script reports create/update summary with no duplicates on rerun.

**Step 4: Verify live**

Check:

- `https://api-production-b1b58.up.railway.app/healthz`
- `https://website-production-7a12.up.railway.app/App/#buy`
- one seeded category listing is visible in the live feed
- listing detail shows the orange `Attention` safety card

**Step 5: Final commit if docs or deploy polish changed**

```bash
git add .
git commit -m "chore: finalize DB seeded listings deploy notes"
```
