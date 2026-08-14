# Zwibba Vitrine Live Listings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an "Ouvrir l'application" CTA to all three site locales (market-aware, `/App/?country=BE` from the Belgian trees), replace the static `annonces/` showcase with the real API feed injected server-side (60 s cache, static fallback, honest empty state), teach the app to display EUR prices, and ship a Belgian listings seed mechanism.

**Architecture:** A new `shared/live-listings.mjs` renders API feed items into the existing `listing-card` markup (locale-aware category labels, `/assets/brand/og-default.png` image fallback) and swaps them into named slot markers that `scripts/build.mjs` now emits *inside* the existing browse containers — a `featured` slot inside `.feature-strip` and a `grid` slot inside `#browse-results-grid` — so injection never removes the containers the CSS and `src/site/app.js` filters depend on; the markers carry `slot`, `market` and `locale`, the static demo cards stay as the CD fallback, a visible localized empty state becomes the BE fallback, and a hidden `<template data-live-listings-empty>` on every browse page lets the server inject an honest empty state when the feed succeeds with zero items (the featured slot is emptied on any successful injection, since the feed exposes no featured flag). `server.mjs` detects the marker in HTML files it serves, fetches `GET {api}/listings?countryCode={market}` with the existing 2.5 s timeout pattern, and injects with a per-market 60 s in-memory cache (stale-on-error). The app honours a `?country=` boot parameter through two new pure helpers in `country-preference.mjs`, and `formatListingPrice` in `App/utils/rendering.mjs` learns EUR. `apps/api` gains `belgian-seed-listings.ts` (EUR, `countryCode: 'BE'`) plus a runner script, mirroring the system-seed pattern.

**Tech Stack:** Vanilla JS ESM (`shared/`, `scripts/build.mjs`, `server.mjs`, `App/`), node `--test` root suite, NestJS API with Prisma and the custom `run-tests.mjs` runner in `apps/api`.

Note: the design/implementation pair itself is committed to `docs/plans/` by the worktree setup block before execution starts; Task 1 only indexes it.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Verify both plan files exist in `docs/plans/` (they are committed by the branch setup), then append the two filenames to the "Current priority docs" list in `docs/plans/README.md`, after the latest existing entry, before the "Legacy docs" trailer:

```
- `2026-08-14-zwibba-vitrine-live-listings-design.md`
- `2026-08-14-zwibba-vitrine-live-listings-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `ls docs/plans/2026-08-14-zwibba-vitrine-live-listings-*.md && rg -n "vitrine-live-listings" docs/plans/README.md`
Expected: both files listed, and both filenames appear in README.md on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index vitrine-live-listings plans"
```

---

### Task 2: Cover the shared live-listings renderer

**Files:**
- Create: `tests/live-listings-render.test.mjs`

**Step 1: Write the failing test**

Test `shared/live-listings.mjs` as a pure module. Assert that:

- `renderLiveListingCards({ items, categories })` with one BE item (`{ slug: 'velo-cargo-bruxelles', title: 'Vélo cargo électrique', categoryId: 'vehicles', categoryLabel: 'Véhicules', locationLabel: 'Bruxelles', priceAmount: 950, priceCurrency: 'EUR', primaryImageUrl: 'https://cdn.test/velo.jpg' }`) and `categories: [{ slug: 'vehicles', label: 'Voertuigen' }]` returns HTML containing `data-listing-card`, `href="/annonce/velo-cargo-bruxelles/"`, the escaped title, the image URL, the locale label `Voertuigen` (not the API's French label), and a price string containing `950` and `€`.
- Without a matching category entry, the API `categoryLabel` is used as fallback.
- A CDF item formats with `CDF` instead.
- An item without `primaryImageUrl` falls back to `/assets/brand/og-default.png`.
- HTML-sensitive characters in `title` are escaped.
- `buildStartMarker({ slot: 'grid', market: 'BE', locale: 'nl-BE' })` produces `<!--zwibba-live-listings slot="grid" market="BE" locale="nl-BE" start-->` and `parseStartMarkers(html)` recovers the slots present with `{ market, locale }` (empty when absent).
- `injectLiveListings(html, { featured: '', grid: cardsHtml })` replaces everything between each slot's start marker and its `<!--zwibba-live-listings slot="…" end-->` while keeping both markers and everything outside them (in particular a surrounding `<div class="listing-grid" id="browse-results-grid">` stays intact), and returns the input unchanged when no markers are present; slots without a replacement entry are left untouched.
- `extractEmptyStateTemplate(html)` returns the inner HTML of `<template data-live-listings-empty>…</template>` (null when absent).

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStartMarker,
  extractEmptyStateTemplate,
  injectLiveListings,
  parseStartMarkers,
  renderLiveListingCards,
} from '../shared/live-listings.mjs';

test('renders a feed item as a listing card with EUR price and locale label', () => {
  // ...
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/live-listings-render.test.mjs`
Expected: FAIL because `shared/live-listings.mjs` does not exist yet (ERR_MODULE_NOT_FOUND).

**Step 3: Commit**

```bash
git add tests/live-listings-render.test.mjs
git commit -m "test: cover shared live listings card renderer"
```

---

### Task 3: Implement the shared live-listings renderer

**Files:**
- Create: `shared/live-listings.mjs`
- Modify: `shared/listing-og.mjs`

**Step 1: Write the code**

Export the existing private `formatPrice(amount, currency)` from `shared/listing-og.mjs` (behaviour unchanged — `tests/listing-og.test.mjs` must stay green). Create `shared/live-listings.mjs` exporting `buildStartMarker`, `parseStartMarkers`, `renderLiveListingCards`, `injectLiveListings` and `extractEmptyStateTemplate` per the Task 2 contract. Cards reuse the `listing-card` article markup `scripts/build.mjs` produces: link and title anchor to `/annonce/{slug}/`, image from `primaryImageUrl` with the `/assets/brand/og-default.png` fallback, meta line with the locale category label (lookup `categoryId` in the provided `categories`, fallback to the item's `categoryLabel`) and `locationLabel`, footer price from `formatPrice(priceAmount, priceCurrency)`. Card `data-` attributes: `data-listing-card`, `data-category` = `categoryId`, `data-title` = lowercased title, `data-price` = `priceAmount`, `data-condition` and `data-published` empty strings. Escape every interpolated value with a local `escapeHtml` (same implementation style as `server.mjs`).

**Step 2: Run test to verify it passes**

Run: `node --test tests/live-listings-render.test.mjs && node --test tests/listing-og.test.mjs`
Expected: PASS for both files (0 fail).

**Step 3: Commit**

```bash
git add shared/live-listings.mjs shared/listing-og.mjs
git commit -m "feat(site): render live feed cards from shared module"
```

---

### Task 4: Cover the browse-page markers and Belgian empty state

**Files:**
- Create: `tests/live-listings-build.test.mjs`

**Step 1: Write the failing test**

Build the site once (same `spawnSync('node', ['scripts/build.mjs'])` pattern as `tests/build.test.mjs`) and assert on the emitted files:

- `dist/annonces/index.html` contains the `slot="featured"` marker pair *inside* the `.feature-strip` div and the `slot="grid"` marker pair *inside* `<div class="listing-grid" id="browse-results-grid">` (assert the container tags appear before the start markers), both carrying `market="CD" locale="fr-CD"`, with the existing demo `listing-card` markup still present between the grid markers (static CD fallback).
- `dist/be/annonces/index.html` and `dist/be/nl/annonces/index.html` contain the same two slot pairs with `market="BE"` and their locale codes, and inside the grid slot a visible `data-live-listings-empty-state` element whose copy comes from the new `ui.browse.emptyState` locale keys (assert the fr-BE string appears in the fr page and the nl-BE string in the nl page).
- All three pages contain a `<template data-live-listings-empty>` element carrying the same localized empty-state copy (including `dist/annonces/index.html`, whose visible fallback stays the demo cards).

**Step 2: Run test to verify it fails**

Run: `node --test tests/live-listings-build.test.mjs`
Expected: FAIL because the markers, the template and the `ui.browse.emptyState` copy are not emitted yet.

**Step 3: Commit**

```bash
git add tests/live-listings-build.test.mjs
git commit -m "test: cover browse page live-listings markers and be empty state"
```

---

### Task 5: Emit markers, template and empty state from the build

**Files:**
- Modify: `scripts/build.mjs`
- Modify: `src/site/locales/fr-cd.mjs`
- Modify: `src/site/locales/fr-be.mjs`
- Modify: `src/site/locales/nl-be.mjs`

**Step 1: Write the code**

Add `emptyState: { title, copy, cta }` under `ui.browse` in the three locale files (fr-CD: "Aucune annonce disponible pour le moment." variant; fr-BE: "Soyez le premier à publier en Belgique." plus open-app CTA label; nl-BE: Dutch equivalents, flagged for native review like the rest of `nl-be.mjs`). In `renderBrowsePage`, keep the `.feature-strip` and `#browse-results-grid` containers exactly where they are and wrap only their *inner* content in the corresponding slot markers built with `buildStartMarker({ slot, market: site.market, locale: `${site.language}-${site.market}` })` (import the helpers from `shared/live-listings.mjs`); when `listings.length === 0`, render a visible `data-live-listings-empty-state` block from `ui.browse.emptyState` inside the grid slot instead of the empty cards. Always emit `<template data-live-listings-empty>` with the same block just after the grid container, on all locales.

**Step 2: Run test to verify it passes**

Run: `node --test tests/live-listings-build.test.mjs && node --test tests/build-locales.test.mjs tests/locale-parity.test.mjs`
Expected: PASS for all three files (0 fail).

**Step 3: Commit**

```bash
git add scripts/build.mjs src/site/locales/fr-cd.mjs src/site/locales/fr-be.mjs src/site/locales/nl-be.mjs
git commit -m "feat(site): emit live-listings markers with static fallback"
```

---

### Task 6: Cover the open-app CTA per locale

**Files:**
- Modify: `tests/live-listings-build.test.mjs`

**Step 1: Write the failing test**

Extend the build assertions:

- `dist/index.html` nav contains a `button--primary` linking to `/App/` labelled with the fr-CD `ui.nav.openApp` string, and the hero `store-row` starts with the same link.
- `dist/be/index.html` and `dist/be/nl/index.html` link to `/App/?country=BE` instead, with their own locale labels.
- The former "Télécharger" nav link is still present but as `button--ghost`.

**Step 2: Run test to verify it fails**

Run: `node --test tests/live-listings-build.test.mjs`
Expected: FAIL because `ui.nav.openApp` and the CTA links do not exist yet.

**Step 3: Commit**

```bash
git add tests/live-listings-build.test.mjs
git commit -m "test: cover open-app cta links per locale"
```

---

### Task 7: Add the open-app CTA to nav and hero

**Files:**
- Modify: `scripts/build.mjs`
- Modify: `src/site/locales/fr-cd.mjs`
- Modify: `src/site/locales/fr-be.mjs`
- Modify: `src/site/locales/nl-be.mjs`

**Step 1: Write the code**

Add `ui.nav.openApp` to the three locales (FR: "Ouvrir l'application", NL: "App openen"). In `scripts/build.mjs`, add an `appHref(site)` helper returning `/App/` when `site.market === 'CD'` and `/App/?country=BE` otherwise (plain hrefs, not `localeHref` — the app is only emitted at the root). In `renderNav`, insert the open-app link as the `button--primary` and demote the "Télécharger" link to `button--ghost`. In `renderLandingPage`, prepend the same link as a `button button--primary` inside the hero `store-row`.

**Step 2: Run test to verify it passes**

Run: `node --test tests/live-listings-build.test.mjs && node --test tests/build.test.mjs tests/locale-parity.test.mjs`
Expected: PASS for all files (0 fail).

**Step 3: Commit**

```bash
git add scripts/build.mjs src/site/locales/fr-cd.mjs src/site/locales/fr-be.mjs src/site/locales/nl-be.mjs
git commit -m "feat(site): add open application cta to nav and hero"
```

---

### Task 8: Cover the country query parameter helpers

**Files:**
- Modify: `tests/country-preference.test.mjs`

**Step 1: Write the failing test**

Add cases for two new pure exports in `App/services/country-preference.mjs`:

- `readCountryFromSearch('?country=BE')` returns `'BE'`; `'?country=CD'` returns `'CD'`; mixed params (`'?utm=x&country=BE'`) still resolve; `'?country=FR'`, `'?country='`, `''`, `null` return `null`.
- `stripCountrySearchParam({ pathname: '/App/', search: '?country=BE&utm=x', hash: '#buy' })` returns `/App/?utm=x#buy`; with `search: '?country=BE'` and `hash: '#buy'` it returns `/App/#buy`; the hash and unrelated params are always preserved and only `country` is removed.

**Step 2: Run test to verify it fails**

Run: `node --test tests/country-preference.test.mjs`
Expected: FAIL because neither helper is exported yet.

**Step 3: Commit**

```bash
git add tests/country-preference.test.mjs
git commit -m "test: cover country query parameter parsing"
```

---

### Task 9: Apply the country parameter at app boot

**Files:**
- Modify: `App/services/country-preference.mjs`
- Modify: `App/app.js`

**Step 1: Write the code**

Implement `readCountryFromSearch(search)` with `URLSearchParams`, normalizing through the same `'BE' | 'CD'` guard as `normalizeStoredCountry`, and `stripCountrySearchParam({ pathname, search, hash })` per the Task 8 contract. In `App/app.js`, immediately after `const countryPreference = createCountryPreference({ storage: window.localStorage });`, read `readCountryFromSearch(window.location.search)`; when non-null, call `countryPreference.setStoredCountry(country)` and rewrite the URL with `history.replaceState(null, '', stripCountrySearchParam(window.location))`. No other boot logic changes.

**Step 2: Run test to verify it passes**

Run: `node --test tests/country-preference.test.mjs`
Expected: PASS (0 fail).

**Step 3: Commit**

```bash
git add App/services/country-preference.mjs App/app.js
git commit -m "feat(app): apply country query parameter at boot"
```

---

### Task 10: Cover EUR display in the app price formatter

**Files:**
- Create: `tests/listing-price-format.test.mjs`

**Step 1: Write the failing test**

Test `formatListingPrice` from `App/utils/rendering.mjs`:

- `{ priceAmount: 950, priceCurrency: 'EUR' }` renders `950 €`.
- `{ priceAmount: 1250, priceCurrency: 'EUR' }` renders with the fr-FR grouping (`1 250 €`).
- Existing behaviours are locked in: `{ priceAmount: 25000, priceCurrency: 'CDF' }` ends with `CDF`, `{ priceAmount: 40, priceCurrency: 'USD' }` ends with `US$`, `{ priceAmount: 0, priceCurrency: 'EUR' }` renders `À donner`, and a null amount renders `—`.

**Step 2: Run test to verify it fails**

Run: `node --test tests/listing-price-format.test.mjs`
Expected: FAIL because EUR currently falls through to the CDF label.

**Step 3: Commit**

```bash
git add tests/listing-price-format.test.mjs
git commit -m "test: cover eur listing price formatting"
```

---

### Task 11: Teach formatListingPrice EUR

**Files:**
- Modify: `App/utils/rendering.mjs`

**Step 1: Write the code**

Extend the currency resolution in `formatListingPrice` to recognize `priceCurrency === 'EUR'` (and `currency === 'EUR'`) and suffix `€` after the existing fr-FR grouped amount. Do not change the USD, CDF, zero-amount or null-amount paths.

**Step 2: Run test to verify it passes**

Run: `node --test tests/listing-price-format.test.mjs && node --test tests/app-home.test.mjs tests/listing-detail-screen.test.mjs`
Expected: PASS for all files (0 fail).

**Step 3: Commit**

```bash
git add App/utils/rendering.mjs
git commit -m "feat(app): format eur listing prices"
```

---

### Task 12: Cover server-side live listings injection

**Files:**
- Create: `tests/live-listings-server.test.mjs`

**Step 1: Write the failing test**

Mirror the `withServer`/`withMockApi` helpers from `tests/build.test.mjs` but bind the site server to port `4317` (avoid clashing with `build.test.mjs`'s 4311 in parallel runs) and the mock API to an ephemeral port passed as `ZWIBBA_API_BASE_URL`. Assert:

- `GET /be/annonces/` returns HTML containing a live BE card title served by the mock API (which received `countryCode=BE`) and no visible `data-live-listings-empty-state` block, and the injected `data-listing-card` markup sits inside `<div class="listing-grid" id="browse-results-grid">` (assert the container still wraps the cards); on `/be/nl/annonces/` the injected card shows the Dutch category label (mock item `categoryId: 'vehicles'` → `Voertuigen` from `src/site/locales/nl-be.mjs`).
- `GET /annonces/` requests `countryCode=CD` and shows the mock CD titles instead of the static demo cards, and the demo featured-strip cards are gone (featured slot emptied).
- With the mock API returning `{ items: [] }`, both `/annonces/` and `/be/annonces/` serve the localized empty state (the CD demo cards are NOT shown).
- With the mock API returning 500, `GET /annonces/` still returns 200 with the static demo cards and `GET /be/annonces/` with the static empty state (fallback path).
- Two consecutive `GET /be/annonces/` within the TTL hit the mock API only once (count requests in the mock handler).

**Step 2: Run test to verify it fails**

Run: `node --test tests/live-listings-server.test.mjs`
Expected: FAIL because `server.mjs` serves the static file without injection (live titles absent).

**Step 3: Commit**

```bash
git add tests/live-listings-server.test.mjs
git commit -m "test: cover server-side live listings injection"
```

---

### Task 13: Inject the live feed in server.mjs

**Files:**
- Modify: `server.mjs`

**Step 1: Write the code**

In the static-file branch of the request handler, when the resolved file ends in `.html`, decode the body and run `parseStartMarkers` from `shared/live-listings.mjs`. When markers are present, resolve the feed through a new `fetchBrowseFeed(market)` (`GET {apiBaseUrl}/listings?countryCode={market}`, `AbortSignal.timeout(2500)`, same style as `fetchListing`) behind a per-market in-memory cache `{ items, fetchedAt }` with a 60 000 ms TTL; on fetch failure reuse a stale cache entry when available, otherwise serve the file unchanged. On success, call `injectLiveListings(body, { featured: '', grid })` where `grid` is `renderLiveListingCards({ items, categories })` when `items.length > 0` (with `categories` from a static map of the three imported locale modules keyed by the marker's `locale`) and `extractEmptyStateTemplate(body)` when `items.length === 0`; the featured slot is always emptied on successful injection. Recompute `Content-Length` from the injected body. Non-HTML files and files without markers keep the existing fast path untouched.

**Step 2: Run test to verify it passes**

Run: `node --test tests/live-listings-server.test.mjs && node --test tests/build.test.mjs`
Expected: PASS for both files (0 fail).

**Step 3: Commit**

```bash
git add server.mjs
git commit -m "feat(server): inject live feed into annonces pages with cache"
```

---

### Task 14: Cover the Belgian seed upsert

**Files:**
- Create: `apps/api/test/listings/belgian-seed-listings.test.ts`

**Step 1: Write the failing test**

Mirror `apps/api/test/listings/system-seeded-listings.test.ts`: drive `upsertBelgianSeedListings` with the same fake Prisma-client double and assert that every definition upserts a draft, a draft photo and a listing; that every listing row sets `countryCode: 'BE'`, `priceCurrency: 'EUR'`, an integer `priceAmount`, and mirrors `priceAmount` into `priceCdf`; that `moderationStatus` is `'approved'`; and that slugs are unique and stable across two runs (second run counts as updates, not creates).

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- belgian-seed`
Expected: FAIL because `../src/listings/belgian-seed-listings` does not exist yet.

**Step 3: Commit**

```bash
git add apps/api/test/listings/belgian-seed-listings.test.ts
git commit -m "test: cover belgian seed listings upsert"
```

---

### Task 15: Implement the Belgian seed module and script

**Files:**
- Create: `apps/api/src/listings/belgian-seed-listings.ts`
- Create: `apps/api/scripts/seed-belgian-listings.ts`

**Step 1: Write the code**

`belgian-seed-listings.ts` mirrors `system-seeded-listings.ts`: a `RawBelgianSeed` type (`priceCurrency: 'EUR'`, whole-euro `priceAmount`), three example seeds (Belgian cities such as Bruxelles/Anvers/Liège, `photoPublicUrl` under `/assets/listings/`, placeholder `+32` owner numbers) clearly commented as content Yves must replace before any production run, and `upsertBelgianSeedListings(prisma)` reusing the same draft + draftPhoto + listing upsert flow with `countryCode: 'BE'` and `priceCdf` mirrored from `priceAmount` on both create and update. `scripts/seed-belgian-listings.ts` copies `seed-system-listings.ts` verbatim with the new import.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- belgian-seed`
Expected: PASS (0 fail).

**Step 3: Commit**

```bash
git add apps/api/src/listings/belgian-seed-listings.ts apps/api/scripts/seed-belgian-listings.ts
git commit -m "feat(api): add belgian seed listings script"
```

---

### Task 16: Full verification pass

**Files:**
- None modified.

**Step 1: Run the full root suite sequentially**

Run: `node scripts/build.mjs && node --test --test-concurrency=1 tests/*.test.mjs`
Expected: 0 fail (the suite is known-flaky in parallel mode because several test files rebuild the shared `dist/`; sequential mode is the reference).

**Step 2: Run the smokes and API suite**

Run: `npm run smoke:website && pnpm -C apps/api test`
Expected: smoke passes (dist artifacts present), API suite 0 fail.

**Step 3: Commit**

Skip the commit step for this task because no file was modified.
