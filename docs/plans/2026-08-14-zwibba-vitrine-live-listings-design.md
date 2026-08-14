# Zwibba Vitrine Live Listings Design

**Date:** 2026-08-14

## Goal

Give every visitor of the marketing site (fr-CD, fr-BE, nl-BE) a visible way into the web application in the right market, and replace the static showcase listings on the `annonces/` pages with the real feed served by the API, so the Belgian site finally shows Zwibba with actual listings.

## Problem

The Belgian landing trees shipped by the belgian-landing plan (`/be/` and `/be/nl/`) contain no link to the application at all: `renderNav` in `scripts/build.mjs` renders only the nav links plus an "Explorer" ghost button (`/annonces/`) and a "Télécharger" primary button (`/ambassadeur/`), and the hero renders only store badges via `renderStoreButtons`. The app itself lives at `/App/` and already supports the Belgian market (a CD/BE browse switch in `App/features/home/buy-screen.mjs`, a stored preference in `App/services/country-preference.mjs`, a Cloudflare geo cookie), but nothing on the site points to it.

Worse, the `annonces/` pages are built from static `listings` arrays in the locale content files. `src/site/locales/fr-cd.mjs` carries hand-written demo listings, while `src/site/locales/fr-be.mjs` and `src/site/locales/nl-be.mjs` export `listings = []` — so `/be/annonces/` renders an empty grid with no explanation, and `/annonces/` shows demo content instead of the ~160 real approved CD listings the API already serves at `GET /listings?countryCode=CD`.

Two adjacent app-side gaps surfaced during plan review. First, `formatListingPrice` in `App/utils/rendering.mjs` only recognizes `USD` and otherwise labels every amount `CDF`, so the Belgian EUR listings this plan seeds would display as CDF inside the app's buyer feed (`App/features/home/recent-feed-section.mjs`) and listing detail (`App/features/listings/listing-detail-screen.mjs`). Second, the API's `toListingSummary` returns hardcoded French `categoryLabel` values, which would leak French labels onto the Dutch `/be/nl/annonces/` page unless the site renderer maps `categoryId` through the locale's own category labels.

Finally, the Belgian feed itself is empty in production. Real signups are still blocked by OTP demo mode (the Meta WhatsApp number is not provisioned yet), so the first Belgian listings must be seeded server-side, the way `apps/api/scripts/seed-system-listings.ts` seeds CD content.

## Non-Goals

- No iframe or embedded app view inside the marketing pages; the app stays at `/App/`.
- No change to the landing home "Annonces en avant" section (it keeps its static `content.listings` behaviour; fr-BE/nl-BE keep hiding it while their arrays are empty).
- No fix for the latent EUR/`priceCdf` downgrade risk in `resolveSubmittedListingPrice` on the submission path, already tracked separately; this plan only fixes EUR display.
- No EUR wallet/boost pricing work (deferred to its own plan pair).
- No change to the desktop fullscreen app shell — that ships separately as PR #44 (`codex/app-fullscreen-desktop`) and must merge before this branch executes because both touch `scripts/build.mjs`; this branch is then rebased on the updated trunk.
- Running the Belgian seed against production is a manual step Yves triggers after validating the seed content; this plan only delivers the mechanism plus reviewable example data. Deployment itself stays manual (the repo's Railway phase runs after the PR merges, on Yves's go).
- No redesign of the browse filter panel. Live cards carry an empty `data-condition`/`data-published`, so the condition filter and date sort degrade gracefully on live content; refining those filters is out of scope.
- No localization of API responses; the Dutch label concern is solved site-side by mapping `categoryId` to the locale's category labels.

## Existing System

`server.mjs` is a thin static file server over `dist/`: `resolveFile` serves any matching file or `index.html` first, and only when no static file matches does the `/annonce/:slug` dynamic branch run — it fetches `GET {api}/listings/:slug` (2.5 s timeout, `resolveApiBaseUrl(process.env)` from `shared/api-base-url.mjs`), builds OG tags via `buildListingOgTags` from `shared/listing-og.mjs` (whose private `formatPrice` already formats EUR and CDF, and whose fallback image is `/assets/brand/og-default.png`), and redirects to `/App/#listing/:slug`. Static `annonce/{slug}/` pages exist only for the demo slugs baked into the locale content; real feed slugs have no static page and therefore always reach the dynamic branch. The server also sets the geo cookie via `resolveGeoCountry`/`buildGeoCookie` from `shared/geo-country.mjs`.

`scripts/build.mjs` emits one page tree per locale (root, `/be/`, `/be/nl/` via each locale's `site.urlPrefix`) with `localeHref(site, path)` for internal links. `renderBrowsePage` renders the `annonces/` page: a featured strip, a filter panel with category chips, and a grid of `renderListingCard` cards whose `data-category`, `data-condition`, `data-price`, `data-title`, `data-published` attributes drive the client-side filtering in `src/site/app.js` (search, chips, condition, price sort). The locale content modules `src/site/locales/{fr-cd,fr-be,nl-be}.mjs` are plain ES modules importable by Node at runtime, each exporting `site`, `ui`, `categories` (localized labels), `listings` and more.

The API's public feed is `GET /listings?countryCode=CD|BE` (`listBrowseFeed` in `apps/api/src/listings/listings.service.ts`), returning `{ items }` where each item is a `toListingSummary` shape: `categoryId`, `categoryLabel` (French), `id`, `locationLabel`, `priceAmount`, `priceCdf`, `priceCurrency`, `primaryImageUrl`, `slug`, `storyImageUrl`, `title`.

The app boots in `App/app.js`: `createCountryPreference({ storage: window.localStorage })`, and `resolveBrowseCountry()` returns the session phone country, else the stored preference, else `'CD'`. `shouldShowCountrySuggestion()` reads the `zwibba_geo` cookie via `readGeoCountry`. Prices render through `formatListingPrice` in `App/utils/rendering.mjs` (USD else CDF, `0` renders "À donner").

CD seed content lives in `apps/api/src/listings/system-seeded-listings.ts` (`rawSystemSeeds` + `upsertSystemSeedListings(prisma)` upserting draft, draft photo and listing per seed) driven by `apps/api/scripts/seed-system-listings.ts`, tested by `apps/api/test/listings/system-seeded-listings.test.ts`. The Prisma `Listing` model requires `priceCdf Int` and defaults `countryCode` to `"CD"` and `priceCurrency` to `"CDF"`.

Root tests run with `node --test tests/*.test.mjs`; `tests/build.test.mjs` already has the two helpers this plan needs to imitate: `withServer` (spawns `server.mjs` on a fixed port against the built `dist/`) and `withMockApi` (an in-process HTTP server whose address is passed as `ZWIBBA_API_BASE_URL`). The suite is known-flaky in parallel because several files rebuild the shared `dist/`; sequential (`--test-concurrency=1`) is the reference. API tests run through `pnpm -C apps/api test -- {pattern}`.

## Recommended Architecture

### 1. Shared live-listings renderer

A new `shared/live-listings.mjs` module renders feed items into the same `listing-card` markup the static build produces, so live cards inherit the existing CSS and keep the client-side search and category chips working. `renderLiveListingCards({ items, categories })` takes the locale's `categories` list and labels each card by looking up `categoryId` there, falling back to the API's French `categoryLabel` — this keeps `/be/nl/annonces/` Dutch. Each card links to `/annonce/{slug}/` (live slugs have no static page, so they always hit the server's dynamic OG/redirect branch), shows `primaryImageUrl` falling back to `/assets/brand/og-default.png` (the same brand fallback `shared/listing-og.mjs` uses), and formats the price with the EUR/CDF-aware `formatPrice` currently private in `shared/listing-og.mjs`, which gets exported. The module also exposes the slot-marker helpers (`buildStartMarker({ slot, market, locale })`, `parseStartMarkers(html)` returning the slots present with their market and locale), `injectLiveListings(html, replacementsBySlot)` which swaps the content between each slot's start/end markers and returns the input untouched when markers are absent, and `extractEmptyStateTemplate(html)` which reads the hidden empty-state template described next. Crucially the markers live *inside* the existing containers, so injection never removes the `.feature-strip` or `#browse-results-grid` elements the browse CSS and `src/site/app.js` filters depend on.

### 2. Build-time markers, empty-state template and Belgian fallback

`renderBrowsePage` in `scripts/build.mjs` emits two marker pairs carrying a slot name plus the page's market and locale, both placed inside their existing containers: `<!--zwibba-live-listings slot="featured" market="BE" locale="nl-BE" start-->` … `<!--zwibba-live-listings slot="featured" end-->` wraps the *inner* content of the `.feature-strip` div, and the `slot="grid"` pair wraps the *inner* content of `<div class="listing-grid" id="browse-results-grid">`. The static content between the markers is the no-API fallback: for fr-CD the existing demo featured cards and demo grid cards remain, for fr-BE and nl-BE the grid slot holds a visible localized empty state ("Soyez le premier à publier" plus the open-app CTA) rendered from new `ui.browse.emptyState` copy added to the three locale files. In addition, every browse page (all three locales) emits an invisible `<template data-live-listings-empty>` holding that same localized empty-state block, so the server can inject an honest empty state on any market — including CD — when the API successfully answers with zero items.

### 3. Server-side injection with a short cache

`server.mjs` gains a small interception step: when the resolved static file is HTML and its content contains live-listings markers, the server parses the market, fetches `GET {api}/listings?countryCode={market}` with the same 2.5 s timeout pattern as `fetchListing`, and rewrites the marker blocks before sending (recomputing `Content-Length` from the injected body). When the feed succeeds with items, it injects the rendered cards into the `grid` slot and empties the `featured` slot (the feed exposes no featured flag, and demo featured cards must not sit above real listings); when it succeeds with zero items, it injects the page's own `<template data-live-listings-empty>` content into the grid slot and empties the featured slot — so a genuinely empty CD feed shows the empty state, not the demo cards. Because both slots sit inside their containers, `#browse-results-grid` and its filtering JS keep working on the injected cards. Results are cached in-memory per market for 60 seconds; on fetch failure a stale cache entry is reused when available, otherwise the static file is served unchanged (demo cards on CD, empty state on BE). Because the marker carries the market and locale, the server needs no hardcoded path table and automatically covers `/annonces/`, `/be/annonces/` and `/be/nl/annonces/`; the locale attribute selects which statically imported locale module (`src/site/locales/*.mjs`) supplies the `categories` labels passed to the renderer.

### 4. "Ouvrir l'application" CTA on every locale

The three locale files gain `ui.nav.openApp` (FR: "Ouvrir l'application", NL: "App openen") plus a hero CTA label. `renderNav` renders the open-app link as the primary nav button (the existing "Télécharger" button becomes a ghost button next to "Explorer"), and `renderLandingPage` adds the same link as a primary button at the head of the hero `store-row`. The link target is computed from the locale: `/App/` for fr-CD, `/App/?country=BE` for fr-BE and nl-BE (plain hrefs — the app is only emitted at the root).

### 5. App boot honours the country query parameter

`App/services/country-preference.mjs` gains two pure helpers: `readCountryFromSearch(search)` returning `'BE'`, `'CD'` or `null`, and `stripCountrySearchParam({ search, hash, pathname })` returning the cleaned relative URL with the `country` parameter removed and every other query parameter and the hash preserved. During boot in `App/app.js`, right after `createCountryPreference` is constructed, the app reads `window.location.search`; when a valid country is present it stores it via `setStoredCountry` and rewrites the URL with `history.replaceState`. All downstream behaviour (`resolveBrowseCountry`, the geo suggestion banner, the buy-screen market switch) is unchanged — the parameter simply becomes the stored preference before the first render. The PWA manifest keeps `start_url: '/App/'`; the parameter only appears on site-initiated navigations, so the service worker's cached `/App/` entry is unaffected.

### 6. EUR display inside the app

`formatListingPrice` in `App/utils/rendering.mjs` learns `EUR`: when `priceCurrency` (or `currency`) is `'EUR'`, format the amount with the existing fr-FR grouping and suffix `€` instead of `CDF`/`US$`. The `0 → "À donner"` and null → `—` behaviours stay. This makes the seeded Belgian listings read correctly in the buyer feed cards and the listing detail screen without touching their render code, since both already call this formatter.

### 7. Belgian seed mechanism

A new `apps/api/src/listings/belgian-seed-listings.ts` mirrors the system-seed module: a `RawBelgianSeed` list (EUR prices, whole euros, Belgian cities, `priceCurrency: 'EUR'`) and an `upsertBelgianSeedListings(prisma)` that upserts draft, draft photo and listing per entry, explicitly setting `countryCode: 'BE'` on the listing rows (and mirroring `priceAmount` into the schema-required `priceCdf` column, matching how `resolveListingPrice` prefers `priceAmount`). A new `apps/api/scripts/seed-belgian-listings.ts` runs it exactly like `seed-system-listings.ts`. The plan ships three reviewable example listings whose titles, prices, photos (files to drop under `public/assets/listings/`) and owner phone numbers Yves replaces with real content before the script is ever run against production; the owner numbers matter because the app's WhatsApp contact action targets the seller's own number.
