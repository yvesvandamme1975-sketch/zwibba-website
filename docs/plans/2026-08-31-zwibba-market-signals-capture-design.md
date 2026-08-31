# Zwibba Market Signals Capture Design

**Date:** 2026-08-31

## Goal

Capture the two market signals Zwibba currently discards — what buyers search for, and how sellers move their prices — as append-only rows partitioned by market country, so that the platform accumulates a continuous price-and-demand series from its first real user onward instead of starting that series the day someone asks for it.

## Problem

Buyer search never reaches the backend. `App/features/home/buyer-browse-controller.mjs` holds the query in `state.searchQuery`, mutates it through `setSearchQuery`, and `getFilteredFeed()` filters `state.feedItems` locally with `normalizeSearchValue` and `matchesCategory`. The feed itself arrives from `GET /listings`, which `apps/api/src/listings/listings.controller.ts` narrows by `countryCode` only. A buyer who searches for something Zwibba does not carry produces no server-side trace at all, so the unmet-demand signal is destroyed at the instant it is created.

Price is a mutable column. `Listing.priceAmount` and `Listing.priceCurrency`, and their `Draft` counterparts, are overwritten in place; `POST /drafts/sync` in `apps/api/src/drafts/drafts.controller.ts` upserts the draft wholesale through `drafts.service.ts`. The one append-only table in the schema, `ListingLifecycleEvent`, records `previousStatus` and `nextStatus` only — never price. The relation between a price cut and a sale therefore cannot be reconstructed after the fact, even though `Listing.soldAt` and `Listing.soldChannel` already record the outcome side of it.

Both losses are irreversible. No backfill recovers a search that was never transmitted or a price that was overwritten. At the same time the platform is pre-launch with no production traffic, which makes this the cheapest moment in its life to add the capture: there is no data to migrate, no live write path to rewrite, and no retroactive consent to collect.

Finally, the Democratic Republic of the Congo and Belgium are equal-priority markets that must stay cleanly separable. `Listing` and `User` already carry an indexed `countryCode`, but any new table that omits it forces a migration the first time the two markets need to be reported on independently.

## Non-Goals

- No buyer-facing or seller-facing feature. Nothing in this plan changes what any user sees or does.
- No server-side search. `GET /listings` keeps returning the country feed and filtering stays in the PWA.
- No aggregation, reporting, dashboard, or export surface. This plan writes rows; reading them is a later plan.
- No consent ledger, no terms-of-service change, no anonymised export view. Those are required before any third party sees this data and are deliberately excluded here.
- No FX rate snapshot and no cross-currency normalisation. Currency is recorded as the seller entered it.
- No listing view or impression tracking.
- No change to `apps/mobile`, `apps/admin`, or the moderation surface.

## Existing System

`apps/api/prisma/schema.prisma` defines nineteen models. `Listing` carries `priceAmount`, `priceCurrency`, `priceCdf`, an indexed `countryCode` defaulting to `CD`, `area`, `categoryId`, `publishedAt`, `soldAt`, `soldChannel`, `lifecycleStatus`, and `shareCount`. `Draft` mirrors the same price triplet and `countryCode`, and is the row a `Listing` is created from through a one-to-one relation on `draftId`.

`priceCdf` is not a converted amount. `apps/api/src/common/price-validation.ts` returns `legacyPriceCdf: priceAmount`, so the field is a legacy mirror of the entered amount and the pair `priceAmount` plus `priceCurrency` is the only price truth in the schema.

`ListingLifecycleEvent` is the single append-only table today: `action`, `actorPhoneNumber`, `previousStatus`, `nextStatus`, `reasonCode`, `reasonLabel`, `metadataJson`, `createdAt`, indexed on `[listingId, createdAt]`. It is the shape this plan reuses rather than inventing a new one.

`apps/api/src/listings/listings.controller.ts` exposes `GET /listings` with a single `countryCode` query parameter normalised by `normalizeMarketCountryCode` from `../auth/phone-country`, plus `GET /listings/mine`, `POST /listings/:listingId/lifecycle`, `GET /listings/:slug`, and `POST /listings/:slug/share`. That share endpoint is the precedent this plan follows for capture: it is unauthenticated, declared `@HttpCode(200)`, wraps `incrementShareCount` in a `try`/`catch` that swallows every error, and returns `{ ok: true }` unconditionally.

`apps/api/src/drafts/drafts.controller.ts` exposes `POST /drafts/sync` and `DELETE /drafts/:draftId`. `drafts.service.ts` performs the upsert and validates the amount through `assertSupportedPriceCdf`. This is the only write path through which a seller price reaches the database before publication.

On the client, `App/services/listings-service.mjs` exports `createListingsService`, the single API client for listing reads. `App/features/home/buyer-browse-controller.mjs` is the browse state machine holding `searchQuery`, `selectedCategoryId`, `feedItems`, and `feedStatus`.

Tests run through two runners. `apps/api/scripts/run-tests.mjs` collects every `.ts` file under `apps/api/test/` and accepts a substring filter as its first argument, so `pnpm -C apps/api test market-signals` runs only the new suite. The PWA suite is `node --test --test-concurrency=1 tests/*.test.mjs` from the repository root. Per `CLAUDE.md`, Prisma is the source of truth for schema changes and migration SQL is never hand-written.

## Recommended Architecture

### 1. A dedicated market-signals module rather than additions to the listings module

Capture lands in a new NestJS module at `apps/api/src/market-signals/`, with `market-signals.module.ts`, `market-signals.controller.ts`, and `market-signals.service.ts`, registered in `apps/api/src/app.module.ts`. Keeping it out of `listings` and `drafts` means the capture surface can later be rate-limited, exported, or moved without touching the product read paths, and it makes the boundary between "what the product needs" and "what the dataset needs" legible in the directory tree.

### 2. SearchQueryEvent, the buyer intent table

A new Prisma model records one row per settled buyer search: a normalised query string alongside the raw one, the category filter active at the time, the number of results the client actually displayed, the market country, and a creation timestamp. It is indexed on `[countryCode, createdAt]` for time series and on `[countryCode, normalizedQuery]` for demand aggregation.

The table carries no user id, no phone number, and no session token. A zero-result search needs no identity to be useful, and keeping the table identity-free from birth means it is non-personal data from the first row — licensable without any consent machinery, and outside the scope of the consent work this plan defers.

On the client, `buyer-browse-controller.mjs` reports the query once it has settled rather than on every keystroke, together with the result count `getFilteredFeed()` produced, through a new method on the listings service. Debouncing is what separates a demand signal from keystroke noise.

### 3. ListingPriceEvent, the price movement table

A second Prisma model records every observed change to a price, shaped after `ListingLifecycleEvent`: the draft it belongs to, the listing once one exists, the previous amount and currency, the next amount and currency, a source discriminator distinguishing a draft sync from an initial publication, the market country, and a creation timestamp. It is indexed on `[listingId, createdAt]` and `[countryCode, createdAt]`.

Emission happens in `drafts.service.ts` when an incoming sync carries a price that differs from the stored one, and once more when a draft is published so that the opening price is itself an event. Combined with the `soldAt` and `soldChannel` fields already on `Listing`, this is what makes "how far did a seller have to drop before it sold, and how long did it take" answerable.

### 4. countryCode as a first-class, non-nullable partition on both tables

Both new models carry `countryCode` normalised through the existing `normalizeMarketCountryCode`, indexed, and never nullable. This is the single schema decision that keeps the Congolese and Belgian series independently producible, priceable, and licensable without a later migration, and it costs nothing to take now.

### 5. Capture that can never degrade the product

The controller follows `incrementShareCount` exactly: unauthenticated, `@HttpCode(200)`, every error swallowed, `{ ok: true }` returned unconditionally. The client call is fire-and-forget and is never awaited on a render path. Emission inside `drafts.service.ts` is wrapped so that a failure to record a price event cannot fail a draft sync. A lost signal degrades the dataset; it must never degrade the application.
