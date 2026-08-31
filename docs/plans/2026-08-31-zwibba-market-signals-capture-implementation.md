# Zwibba Market Signals Capture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist buyer search intent and seller price movement as append-only, country-partitioned rows, without changing any user-visible behaviour and without allowing a capture failure to degrade the product.

**Architecture:** Two new Prisma models, `SearchQueryEvent` and `ListingPriceEvent`, deliberately carry no foreign-key relation to `Draft` or `Listing` so that deleting a draft or a listing cannot cascade away its own history. A new NestJS module at `apps/api/src/market-signals/` owns both: two pure helpers decide what a valid event looks like, a service persists them, and an unauthenticated controller exposes `POST /market-signals/search` following the fire-and-forget contract of `POST /listings/:slug/share`. Price events are emitted from `drafts.service.ts` inside the existing sync path. On the client, a debounced reporter in `App/utils/` turns settled search state into one call, wired through `App/services/listings-service.mjs` and `App/features/home/buyer-browse-controller.mjs`.

**Tech Stack:** NestJS 11, Prisma 6, TypeScript, the custom API runner `apps/api/scripts/run-tests.mjs` (`node --import tsx --test`), vanilla JS ESM for the PWA, root `node --test tests/*.test.mjs`.

**Precondition:** Task 2 runs `prisma migrate dev`, which requires a reachable `DATABASE_URL` for the local development database. Confirm one is configured before starting; do not hand-write the migration SQL.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the "Current priority docs" list in `docs/plans/README.md`, after the latest existing entry, before the "Legacy docs" trailer:

```
- `2026-08-31-zwibba-market-signals-capture-design.md`
- `2026-08-31-zwibba-market-signals-capture-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "market-signals-capture" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index market-signals-capture plans"
```

---

### Task 2: Add the two append-only market signal models

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/{generated}_market_signals_capture/migration.sql`

**Step 1: Write the schema change**

Append two models to `apps/api/prisma/schema.prisma`. Neither declares a Prisma relation to `Draft` or `Listing`: the ledger must survive the deletion of its subject, and `DELETE /drafts/:draftId` already exists.

```prisma
model SearchQueryEvent {
  id                 String   @id @default(cuid())
  countryCode        String
  rawQuery           String
  normalizedQuery    String
  selectedCategoryId String   @default("")
  resultCount        Int
  createdAt          DateTime @default(now())

  @@index([countryCode, createdAt])
  @@index([countryCode, normalizedQuery])
}

model ListingPriceEvent {
  id               String   @id @default(cuid())
  countryCode      String
  draftId          String
  listingId        String?
  previousAmount   Int?
  previousCurrency String?
  nextAmount       Int
  nextCurrency     String
  source           String
  createdAt        DateTime @default(now())

  @@index([countryCode, createdAt])
  @@index([draftId, createdAt])
  @@index([listingId, createdAt])
}
```

Then generate the migration with Prisma, never by hand:

```bash
pnpm -C apps/api exec prisma migrate dev --name market_signals_capture
```

**Step 2: Verify the schema and migration**

Run: `pnpm -C apps/api exec prisma validate && ls apps/api/prisma/migrations | rg market_signals_capture`
Expected: `The schema at prisma/schema.prisma is valid` followed by one directory name ending in `_market_signals_capture`.

**Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat: add search query and listing price event models"
```

---

### Task 3: Write the failing test for the search event payload helper

**Files:**
- Create: `apps/api/test/market-signals/market-signals-payload.test.ts`

**Step 1: Write the failing test**

Import `buildSearchQueryEventInput` and `normalizeSearchQuery` from `../../src/market-signals/market-signals-payload`. Assert, in the style of `apps/api/test/ai/category-disambiguation.test.ts` (`node:test` + `node:assert/strict`, one `test()` per behaviour):

- `normalizeSearchQuery('  Ciment   SIMBA ')` returns `ciment simba` — trimmed, lowercased, inner whitespace collapsed.
- A query of only whitespace returns `null` from `buildSearchQueryEventInput`: an empty search is not a signal.
- A well-formed call returns an object whose `normalizedQuery` is normalised, whose `rawQuery` preserves the original casing, and whose `resultCount` is the number passed in — including `0`, which is the most valuable case and must not be discarded.
- `countryCode` is normalised through `normalizeMarketCountryCode` from `../../src/auth/phone-country`, so a lowercase `be` yields `BE`.
- A `rawQuery` longer than 120 characters is truncated to 120 in the returned `rawQuery`.
- A `resultCount` that is negative, fractional, or not a number returns `null`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test market-signals`
Expected: FAIL because `src/market-signals/market-signals-payload` does not exist yet.

**Step 3: Commit**

```bash
git add apps/api/test/market-signals/market-signals-payload.test.ts
git commit -m "test: cover search query event payload building"
```

---

### Task 4: Implement the search event payload helper

**Files:**
- Create: `apps/api/src/market-signals/market-signals-payload.ts`

**Step 1: Write the implementation**

Export `normalizeSearchQuery(value: unknown): string` performing trim, lowercase and whitespace collapse, and `buildSearchQueryEventInput(input)` returning either the persistable object or `null`. Reuse `normalizeMarketCountryCode` from `../auth/phone-country` rather than reimplementing country handling. Cap `rawQuery` at 120 characters. Treat `resultCount` as valid only when it is a finite non-negative integer.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test market-signals`
Expected: PASS, all assertions of `market-signals-payload.test.ts` green.

**Step 3: Commit**

```bash
git add apps/api/src/market-signals/market-signals-payload.ts
git commit -m "feat: build validated search query event payloads"
```

---

### Task 5: Write the failing test for MarketSignalsService.recordSearchQuery

**Files:**
- Create: `apps/api/test/market-signals/market-signals.service.test.ts`

**Step 1: Write the failing test**

Instantiate `MarketSignalsService` from `../../src/market-signals/market-signals.service` with a hand-rolled Prisma stub exposing `searchQueryEvent.create`, recording the calls it receives. Assert:

- A valid search records exactly one row, and the `data` passed to `create` carries the normalised query and the raw query.
- A whitespace-only query records nothing: `create` is never called.
- A `resultCount` of `0` still records a row.
- When `create` rejects, `recordSearchQuery` resolves rather than throwing — capture must never propagate an error to a caller.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test market-signals`
Expected: FAIL because `src/market-signals/market-signals.service` does not exist yet.

**Step 3: Commit**

```bash
git add apps/api/test/market-signals/market-signals.service.test.ts
git commit -m "test: cover market signals service search recording"
```

---

### Task 6: Implement the market-signals module, service and controller

**Files:**
- Create: `apps/api/src/market-signals/market-signals.service.ts`
- Create: `apps/api/src/market-signals/market-signals.controller.ts`
- Create: `apps/api/src/market-signals/market-signals.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Write the implementation**

`MarketSignalsService` injects `PrismaService` the same way `StoryImageService` does in `apps/api/src/share/story-image.service.ts`, and exposes `recordSearchQuery`, which builds the payload through `buildSearchQueryEventInput`, returns early on `null`, and wraps the `create` in a `try`/`catch` that swallows.

`MarketSignalsController` is `@Controller('market-signals')` with a single `@Post('search')` marked `@HttpCode(200)`, unauthenticated, mirroring `incrementShareCount` in `apps/api/src/listings/listings.controller.ts`: it awaits the service inside a `try`/`catch` that swallows and returns `{ ok: true }` unconditionally.

`MarketSignalsModule` imports `DatabaseModule`, declares the controller, and both provides and exports `MarketSignalsService` so Task 10 can inject it into `DraftsModule`. Register `MarketSignalsModule` in the `imports` array of `apps/api/src/app.module.ts`.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test market-signals`
Expected: PASS, both `market-signals-payload.test.ts` and `market-signals.service.test.ts` green.

**Step 3: Commit**

```bash
git add apps/api/src/market-signals apps/api/src/app.module.ts
git commit -m "feat: expose fire-and-forget market signals capture endpoint"
```

---

### Task 7: Write the failing test for price event derivation

**Files:**
- Create: `apps/api/test/market-signals/listing-price-event.test.ts`

**Step 1: Write the failing test**

Import `derivePriceEventInput` from `../../src/market-signals/listing-price-event`. Assert:

- With no previous price (a draft being created), the result carries `previousAmount: null`, `previousCurrency: null`, the new amount and currency, and `source: 'draft_created'`.
- With a previous price identical in both amount and currency, the result is `null` — an unchanged sync is not a price movement and must not pollute the series.
- With a changed amount, the result carries both sides and `source: 'draft_sync'`.
- With an unchanged amount but a changed currency, the result is still produced: `450000 CDF` to `450000 USD` is a real movement.
- `countryCode` is normalised through `normalizeMarketCountryCode`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test market-signals`
Expected: FAIL because `src/market-signals/listing-price-event` does not exist yet.

**Step 3: Commit**

```bash
git add apps/api/test/market-signals/listing-price-event.test.ts
git commit -m "test: cover listing price event derivation"
```

---

### Task 8: Implement price event derivation

**Files:**
- Create: `apps/api/src/market-signals/listing-price-event.ts`

**Step 1: Write the implementation**

Export `derivePriceEventInput({ countryCode, draftId, listingId, previous, next, source })` returning the persistable object or `null` when `previous` exists and both its amount and currency equal `next`. Keep it pure: no Prisma import, no clock.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test market-signals`
Expected: PASS, all three market-signals suites green.

**Step 3: Commit**

```bash
git add apps/api/src/market-signals/listing-price-event.ts
git commit -m "feat: derive listing price events from price changes"
```

---

### Task 9: Write the failing test for price event emission on draft sync

**Files:**
- Create: `apps/api/test/market-signals/market-signals.service.price.test.ts`

**Step 1: Write the failing test**

Instantiate `MarketSignalsService` with a Prisma stub exposing `listingPriceEvent.create`, and assert against a new `recordListingPriceEvent` method:

- A first price on a new draft writes one row with `source: 'draft_created'`.
- An unchanged price writes nothing.
- A changed price writes one row carrying both the previous and next amount.
- A rejecting `create` resolves without throwing.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test market-signals`
Expected: FAIL because `recordListingPriceEvent` is not a function on `MarketSignalsService`.

**Step 3: Commit**

```bash
git add apps/api/test/market-signals/market-signals.service.price.test.ts
git commit -m "test: cover listing price event recording"
```

---

### Task 10: Emit price events from the draft sync path

**Files:**
- Modify: `apps/api/src/market-signals/market-signals.service.ts`
- Modify: `apps/api/src/drafts/drafts.service.ts`
- Modify: `apps/api/src/drafts/drafts.module.ts`

**Step 1: Write the implementation**

Add `recordListingPriceEvent` to `MarketSignalsService`, built on `derivePriceEventInput` and wrapped in the same swallowing `try`/`catch`.

In `drafts.service.ts`, inject `MarketSignalsService` alongside the existing `PrismaService` and `R2StorageService`. Inside `syncDraft`, after `persistedDraft` is resolved, call `recordListingPriceEvent` with `previous` taken from `existingDraft` (its `priceAmount` and `priceCurrency`, or `null` when the draft is new), `next` taken from `supportedPrice`, `draftId: persistedDraft.id`, `countryCode: resolvedCountryCode`, and `source` set to `draft_created` or `draft_sync` accordingly. Do not await it in a way that can fail the sync: the service already swallows, but the call must also not be placed before the draft write.

Import `MarketSignalsModule` in `apps/api/src/drafts/drafts.module.ts` so the injection resolves.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test`
Expected: PASS, the full API suite green including the existing drafts tests, which must be unaffected.

**Step 3: Commit**

```bash
git add apps/api/src/market-signals/market-signals.service.ts apps/api/src/drafts/drafts.service.ts apps/api/src/drafts/drafts.module.ts
git commit -m "feat: record a price event on every draft sync"
```

---

### Task 11: Write the failing test for the client search signal reporter

**Files:**
- Create: `tests/search-signal-reporter.test.mjs`

**Step 1: Write the failing test**

Import `createSearchSignalReporter` from `../App/utils/search-signal-reporter.mjs`. Inject a fake scheduler so no real timer runs: pass `scheduleFn` and `cancelFn` that record the pending callback and let the test invoke it. Assert:

- Three rapid `report()` calls followed by one scheduler flush produce exactly one `reportFn` call, carrying the last payload. Debouncing is what separates a demand signal from keystroke noise.
- An empty or whitespace-only query never calls `reportFn`.
- Reporting the same query, category and result count twice in a row calls `reportFn` once: a re-render is not a new search.
- A `reportFn` that rejects does not throw out of the reporter.

**Step 2: Run test to verify it fails**

Run: `node --test tests/search-signal-reporter.test.mjs`
Expected: FAIL because `App/utils/search-signal-reporter.mjs` does not exist yet.

**Step 3: Commit**

```bash
git add tests/search-signal-reporter.test.mjs
git commit -m "test: cover debounced search signal reporting"
```

---

### Task 12: Implement the client search signal reporter

**Files:**
- Create: `App/utils/search-signal-reporter.mjs`

**Step 1: Write the implementation**

Export `createSearchSignalReporter({ reportFn, delayMs = 800, scheduleFn = setTimeout, cancelFn = clearTimeout })` returning `{ report, flush, cancel }`. `report` cancels any pending timer, skips a blank query, skips a payload identical to the last one actually reported, and schedules the send. Keep it a plain ESM module with no DOM access so it stays testable under `node --test`, matching the shape of the existing helpers in `App/utils/`.

**Step 2: Run test to verify it passes**

Run: `node --test tests/search-signal-reporter.test.mjs`
Expected: PASS, all four assertions green.

**Step 3: Commit**

```bash
git add App/utils/search-signal-reporter.mjs
git commit -m "feat: add debounced buyer search signal reporter"
```

---

### Task 13: Write the failing test for the browse controller reporting a search

**Files:**
- Create: `tests/buyer-browse-search-signal.test.mjs`

**Step 1: Write the failing test**

Build a `createBuyerBrowseController` as `tests/app-buyer-routing.test.mjs` already does, passing an additional `searchSignalReporter` stub recording its `report` calls, and a `listingsService` stub whose `listBrowseFeed` returns a small fixed feed. Assert:

- After `loadFeed()` and `setSearchQuery('ciment')`, the reporter received one `report` call whose `rawQuery` is `ciment` and whose `resultCount` equals `controller.getFilteredFeed().length`.
- A search matching nothing reports `resultCount: 0` rather than reporting nothing.
- Constructing the controller without `searchSignalReporter` still works and `setSearchQuery` does not throw, so the three existing call sites in `tests/app-buyer-routing.test.mjs` stay valid.

Also add one assertion in this file that `createListingsService` from `../App/services/listings-service.mjs` exposes `reportSearchQuery`, and that calling it against a `fetchFn` stub that rejects resolves instead of throwing.

**Step 2: Run test to verify it fails**

Run: `node --test tests/buyer-browse-search-signal.test.mjs`
Expected: FAIL because the controller ignores `searchSignalReporter` and `reportSearchQuery` is not a function.

**Step 3: Commit**

```bash
git add tests/buyer-browse-search-signal.test.mjs
git commit -m "test: cover browse controller search signal wiring"
```

---

### Task 14: Wire the reporter through the listings service and the browse controller

**Files:**
- Modify: `App/services/listings-service.mjs`
- Modify: `App/features/home/buyer-browse-controller.mjs`
- Modify: `App/app.js`

**Step 1: Write the implementation**

Add `reportSearchQuery(payload)` to the object returned by `createListingsService`: a `POST` to `${apiBaseUrl}/market-signals/search` with a JSON body, wrapped so that no rejection escapes and no error is parsed. It is deliberately the only method in that file that does not throw on failure.

In `createBuyerBrowseController`, accept an optional `searchSignalReporter` and leave the existing `listingsService` guard untouched so the current call sites keep working. In `setSearchQuery`, after assigning `state.searchQuery`, call `searchSignalReporter?.report(...)` with the raw value, `state.selectedCategoryId`, and `this.getFilteredFeed().length`.

In `App/app.js`, construct the reporter with `reportFn` bound to `listingsService.reportSearchQuery` and pass it into `createBuyerBrowseController` at the existing call site.

**Step 2: Run test to verify it passes**

Run: `npm test`
Expected: PASS, the whole root suite green, including the three pre-existing `createBuyerBrowseController` cases in `tests/app-buyer-routing.test.mjs`.

**Step 3: Commit**

```bash
git add App/services/listings-service.mjs App/features/home/buyer-browse-controller.mjs App/app.js
git commit -m "feat: report settled buyer searches to the market signals endpoint"
```

---

### Task 15: Verify the change end to end

**Files:**
- None

**Step 1: Run every suite the change can touch**

```bash
npm test
pnpm -C apps/api test
npm run smoke:app
npm run smoke:workspaces
```

**Step 2: Confirm the expected result**

Run: the four commands above, in order.
Expected: PASS for both test suites, and both smokes exit `0`. No user-visible behaviour changed: the browse feed, the search box, and the draft sync response bodies are identical to before this plan.

**Step 3: Commit**

Skip the commit step for this task because no file was modified.
