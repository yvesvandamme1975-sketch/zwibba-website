# Zwibba Seller Reviews And Reputation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre à un acheteur vérifié de noter (1-5 étoiles) et commenter une annonce, et afficher la note agrégée par vendeur sur le bloc vendeur du détail annonce et sur le profil vendeur public.

**Architecture:** Nouveau modèle Prisma `Review` (`@@unique([buyerUserId, listingId])`, `sellerPhoneNumber` dénormalisé indexé). Endpoint `POST /listings/:slug/reviews` (auth, upsert, rejet auto-avis, validation rating + commentaire via `apps/api/src/common/review-comment.ts`). Agrégat moyenne/compte calculé à la lecture et défensif (`review?.aggregate?.()`), exposé sur `buildSellerProfile` (détail) et `getPublicSeller` (profil public, avis sans téléphone). Front : util `rating-stars.mjs`, formulaire d'avis sur le détail (non-propriétaire), liste d'avis + agrégat sur l'écran vendeur public, câblage `App/app.js`.

**Tech Stack:** NestJS API, Prisma 6, TypeScript, custom node `--test` runner (`apps/api/scripts/run-tests.mjs`) ; PWA vanilla JS ESM (`App/`), `node --test tests/*.test.mjs`.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the current priority docs list in `docs/plans/README.md`, after the latest existing entry, before the "Legacy docs" trailer:

```
- `2026-06-23-zwibba-seller-reviews-design.md`
- `2026-06-23-zwibba-seller-reviews-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "seller-reviews" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index seller-reviews plans"
```

---

### Task 2: Add the `Review` model (additive migration)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260623130000_seller_reviews/migration.sql`

**Step 1: Write the schema change and migration**

Add `model Review` to `apps/api/prisma/schema.prisma` with: `id String @id @default(cuid())`, `listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)`, `listingId String`, `buyer User @relation("BuyerReviews", fields: [buyerUserId], references: [id], onDelete: Cascade)`, `buyerUserId String`, `sellerPhoneNumber String`, `rating Int`, `comment String?`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, `@@unique([buyerUserId, listingId])`, `@@index([sellerPhoneNumber])`. Add inverse relations: `reviews Review[]` on `Listing`, and `reviews Review[] @relation("BuyerReviews")` on `User`. Create the migration SQL:

```sql
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "sellerPhoneNumber" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Review_buyerUserId_listingId_key" ON "Review"("buyerUserId", "listingId");
CREATE INDEX "Review_sellerPhoneNumber_idx" ON "Review"("sellerPhoneNumber");
ALTER TABLE "Review" ADD CONSTRAINT "Review_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Step 2: Verify the Prisma client regenerates**

Run: `pnpm -C apps/api prisma:generate`
Expected: completes with "Generated Prisma Client" and no error; `rg -n "model Review" apps/api/prisma/schema.prisma` matches.

**Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260623130000_seller_reviews/migration.sql
git commit -m "feat: add Review model"
```

---

### Task 3: Failing test — review comment validator

**Files:**
- Create: `apps/api/test/common/review-comment.test.ts`

**Step 1: Write the failing test**

Add unit tests for a not-yet-existing `normalizeReviewComment` exported from `apps/api/src/common/review-comment.ts`. Assert: returns `null` for empty/whitespace (comment optional); trims; rejects values longer than the max length; rejects a profanity blocklist (reuse the spirit of `display-name.ts`); returns the cleaned string otherwise.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- review-comment`
Expected: FAIL because `apps/api/src/common/review-comment.ts` does not exist.

**Step 3: Commit**

```bash
git add apps/api/test/common/review-comment.test.ts
git commit -m "test: add review comment validation rules"
```

---

### Task 4: Implement the review comment validator

**Files:**
- Create: `apps/api/src/common/review-comment.ts`

**Step 1: Implement**

Create `normalizeReviewComment(raw?: string | null)` mirroring the structure of `apps/api/src/common/display-name.ts`: returns `null` when empty, enforces a max length (e.g. 280), rejects a profanity blocklist via diacritic-normalized search, throws `BadRequestException` with a clear FR message otherwise returns the trimmed comment.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- review-comment`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/common/review-comment.ts
git commit -m "feat: add review comment validator"
```

---

### Task 5: Failing test — `POST /listings/:slug/reviews`

**Files:**
- Create: `apps/api/test/listings/reviews.e2e-spec.ts`

**Step 1: Write the failing test**

Add tests asserting `POST /listings/:slug/reviews` (a) requires a session (401 without); (b) rejects the seller reviewing their own listing with 400 when `session.phoneNumber === listing.ownerPhoneNumber`; (c) rejects `rating` outside 1-5 with 400; (d) creates a review for a valid non-owner session and persists `sellerPhoneNumber` equal to the listing owner; (e) a second submit by the same buyer for the same listing UPDATES the existing review (no duplicate row) thanks to the unique constraint.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- reviews`
Expected: FAIL because the route does not exist.

**Step 3: Commit**

```bash
git add apps/api/test/listings/reviews.e2e-spec.ts
git commit -m "test: expect review create endpoint with self-review and upsert rules"
```

---

### Task 6: Implement the review create endpoint

**Files:**
- Create: `apps/api/src/listings/reviews.controller.ts`
- Create: `apps/api/src/listings/reviews.service.ts`
- Modify: `apps/api/src/listings/listings.module.ts`

**Step 1: Implement**

Add `ReviewsController` with `POST listings/:slug/reviews` guarded by `SessionAuthGuard`, delegating to `ReviewsService.submitReview({ slug, rating, comment, session })`: resolve listing by slug (404 if absent), throw `BadRequestException` if `listing.ownerPhoneNumber === session.phoneNumber`, validate `rating` ∈ [1,5], run `normalizeReviewComment`, then `prismaService.review.upsert` on `{ buyerUserId_listingId: { buyerUserId, listingId } }` setting `sellerPhoneNumber` from the listing. Resolve `buyerUserId` from the session user. Register the controller/service in `listings.module.ts`.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- reviews`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/listings/reviews.controller.ts apps/api/src/listings/reviews.service.ts apps/api/src/listings/listings.module.ts
git commit -m "feat: add review create endpoint"
```

---

### Task 7: Failing test — public seller exposes aggregate and reviews

**Files:**
- Modify: `apps/api/test/profile/seller-public.e2e-spec.ts`

**Step 1: Write the failing test**

Extend the public seller test: after seeding reviews across the seller's listings, assert `GET /sellers/:sellerId` returns `seller.ratingAverage` and `seller.ratingCount` aggregated across all that seller's listings, plus a `reviews` array where each entry has `rating`, `comment`, `createdAt`, and a public buyer identity (`displayName` or neutral fallback) **without any phone number field**. Assert a seller with no reviews returns `ratingAverage: null`, `ratingCount: 0`, `reviews: []`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- seller-public`
Expected: FAIL because `getPublicSeller` does not yet return aggregate/reviews.

**Step 3: Commit**

```bash
git add apps/api/test/profile/seller-public.e2e-spec.ts
git commit -m "test: expect public seller to expose rating aggregate and reviews"
```

---

### Task 8: Implement the defensive aggregate and extend `getPublicSeller`

**Files:**
- Modify: `apps/api/src/profile/profile.service.ts`

**Step 1: Implement**

Add a private aggregate helper computing `{ ratingAverage, ratingCount }` for an `ownerPhoneNumber` via `prismaService.review?.aggregate?.({ _avg: { rating }, _count: { _all: true }, where: { sellerPhoneNumber } })`, returning `{ ratingAverage: null, ratingCount: 0 }` when the delegate is absent or there are no reviews (defensive — narrow fakes must not crash). Extend `getPublicSeller` to add `ratingAverage`/`ratingCount` to `seller`, and a `reviews` list built from `prismaService.review?.findMany?.()` joined to buyer identity, exposing only `rating`, `comment`, `createdAt`, and the buyer's public `displayName` (or neutral fallback) — never `phoneNumber`.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- seller-public`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/profile/profile.service.ts
git commit -m "feat: expose seller rating aggregate and reviews on public profile"
```

---

### Task 9: Failing test — listing detail seller block carries the aggregate

**Files:**
- Modify: `apps/api/test/listings/listings.e2e-spec.ts`

**Step 1: Write the failing test**

Extend the listing-detail test: after seeding reviews for the listing's seller, assert `response.body.seller.ratingAverage` and `response.body.seller.ratingCount` reflect the aggregate, and that a seller with no reviews yields `ratingAverage: null` / `ratingCount: 0` without error.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- listings`
Expected: FAIL because `buildSellerProfile` does not yet include the aggregate.

**Step 3: Commit**

```bash
git add apps/api/test/listings/listings.e2e-spec.ts
git commit -m "test: expect seller block to include rating aggregate"
```

---

### Task 10: Implement the aggregate on `buildSellerProfile`

**Files:**
- Modify: `apps/api/src/listings/listings.service.ts`

**Step 1: Implement**

Extend `buildSellerProfile` to compute and include `ratingAverage` and `ratingCount` for `ownerPhoneNumber` using the same defensive `review?.aggregate?.()` pattern (fallback `null`/`0`). Keep the existing `name`/`role`/`sellerId` behaviour intact.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- listings`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/listings/listings.service.ts
git commit -m "feat: include rating aggregate in seller block"
```

---

### Task 11: Failing test — rating stars util

**Files:**
- Create: `tests/rating-stars.test.mjs`

**Step 1: Write the failing test**

Add `node --test` cases for a not-yet-existing `renderRatingStars({ average, count })` from `App/utils/rating-stars.mjs`: renders a star markup reflecting a rounded average and a `(n avis)` label for count > 0; renders a clear "Pas encore d'avis" state for count 0 / null average; escapes nothing unsafe.

**Step 2: Run test to verify it fails**

Run: `node --test tests/rating-stars.test.mjs`
Expected: FAIL because `App/utils/rating-stars.mjs` does not exist.

**Step 3: Commit**

```bash
git add tests/rating-stars.test.mjs
git commit -m "test: add rating stars helper"
```

---

### Task 12: Implement the rating stars util

**Files:**
- Create: `App/utils/rating-stars.mjs`

**Step 1: Implement**

Create `renderRatingStars({ average, count })` returning the markup per Task 11. Pure function, no DOM.

**Step 2: Run test to verify it passes**

Run: `node --test tests/rating-stars.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/utils/rating-stars.mjs
git commit -m "feat: add rating stars helper"
```

---

### Task 13: Failing test — reviews client service

**Files:**
- Create: `tests/reviews-service.test.mjs`

**Step 1: Write the failing test**

Add `node --test` cases for a not-yet-existing `createReviewsService({ apiBaseUrl, fetchFn })` from `App/services/reviews-service.mjs` with `submitReview({ slug, rating, comment, session })`: POSTs to `${apiBaseUrl}/listings/${slug}/reviews` with the bearer header and JSON body, returns the parsed body, and throws a parsed error on a non-ok response (mirror `App/services/profile-service.mjs`).

**Step 2: Run test to verify it fails**

Run: `node --test tests/reviews-service.test.mjs`
Expected: FAIL because the module does not exist.

**Step 3: Commit**

```bash
git add tests/reviews-service.test.mjs
git commit -m "test: add reviews client service"
```

---

### Task 14: Implement the reviews client service

**Files:**
- Create: `App/services/reviews-service.mjs`

**Step 1: Implement**

Create `createReviewsService({ apiBaseUrl, fetchFn = globalThis.fetch })` with `submitReview`, reusing the error-parsing and `sessionHeaders` shape from `App/services/profile-service.mjs`.

**Step 2: Run test to verify it passes**

Run: `node --test tests/reviews-service.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/services/reviews-service.mjs
git commit -m "feat: add reviews client service"
```

---

### Task 15: Failing test — listing detail shows stars and a non-owner review form

**Files:**
- Modify: `tests/listing-detail-screen.test.mjs`

**Step 1: Write the failing test**

Extend `tests/listing-detail-screen.test.mjs`: when `detail.seller` carries `ratingAverage`/`ratingCount`, the seller block renders the stars markup; for a verified non-owner viewer the output contains a review form with `data-action="submit-review"` and a rating input; for `viewerRole === 'owner'` the review form is absent.

**Step 2: Run test to verify it fails**

Run: `node --test tests/listing-detail-screen.test.mjs`
Expected: FAIL because stars and the review form are not rendered.

**Step 3: Commit**

```bash
git add tests/listing-detail-screen.test.mjs
git commit -m "test: expect stars and non-owner review form on listing detail"
```

---

### Task 16: Implement stars and the review form on listing detail

**Files:**
- Modify: `App/features/listings/listing-detail-screen.mjs`

**Step 1: Implement**

Render the rating stars (via `renderRatingStars`) in the seller block, and a review form (rating selector 1-5 + optional comment, `data-action="submit-review"`) only when the viewer is verified and not the owner. Keep existing seller/contact markup intact.

**Step 2: Run test to verify it passes**

Run: `node --test tests/listing-detail-screen.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/features/listings/listing-detail-screen.mjs
git commit -m "feat: render stars and review form on listing detail"
```

---

### Task 17: Failing test — public seller screen shows aggregate and reviews

**Files:**
- Modify: `tests/seller-public-screen.test.mjs`

**Step 1: Write the failing test**

Extend `tests/seller-public-screen.test.mjs`: with `seller.ratingAverage`/`ratingCount` and a non-empty `reviews` array, the screen renders the aggregate stars and one block per review (buyer name/monogram, stars, comment, date); with `reviews: []` it renders a clear "Pas encore d'avis" empty state.

**Step 2: Run test to verify it fails**

Run: `node --test tests/seller-public-screen.test.mjs`
Expected: FAIL because the aggregate and reviews list are not rendered.

**Step 3: Commit**

```bash
git add tests/seller-public-screen.test.mjs
git commit -m "test: expect aggregate and reviews on public seller screen"
```

---

### Task 18: Implement aggregate and reviews list on the public seller screen

**Files:**
- Modify: `App/features/profile/seller-public-screen.mjs`

**Step 1: Implement**

Render the aggregate (via `renderRatingStars`) under the identity, then the reviews list (buyer monogram + public name, stars, comment, formatted date), with a "Pas encore d'avis" empty state. Keep the listings grid intact; rendering stays light.

**Step 2: Run test to verify it passes**

Run: `node --test tests/seller-public-screen.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/features/profile/seller-public-screen.mjs
git commit -m "feat: render rating aggregate and reviews on public seller screen"
```

---

### Task 19: Wire the review submit action in the app

**Files:**
- Modify: `App/app.js`

**Step 1: Implement**

Add a `submit-review` action handler that reads the rating + comment from the form, calls `reviewsService.submitReview({ slug, rating, comment, session: state.session })`, and on success reloads the current listing (so the new aggregate/review appears) and re-renders; on error surfaces the parsed message. Instantiate `reviewsService` from `createReviewsService` alongside the existing services.

**Step 2: Verify the handler is wired**

Run: `rg -n "submit-review|reviewsService|createReviewsService" App/app.js`
Expected: a `submit-review` handler that calls `reviewsService.submitReview` and an instantiation via `createReviewsService`.

**Step 3: Commit**

```bash
git add App/app.js
git commit -m "feat: wire review submission in app"
```

---

### Task 20: Final cross-cutting verification

**Files:**
- None (verification only)

**Step 1: Run the full API and App suites plus the app build smoke**

Run: `pnpm -C apps/api test && node --test tests/*.test.mjs && npm run smoke:app`
Expected: all API tests PASS, all App tests PASS, and `smoke:app` builds `dist/` with the expected artifacts.

**Step 2: Confirm the aggregate is defensive and no phone leaks in reviews**

Run: `rg -n "review\?\.aggregate\?\." apps/api/src && rg -n "phoneNumber" apps/api/src/profile/profile.service.ts`
Expected: the defensive aggregate access is present in both `listings.service.ts` and `profile.service.ts`, and the `reviews`/public-seller payload in `profile.service.ts` does not place `phoneNumber` in the returned review/buyer objects.

**Step 3:** Skip the commit step for this task because no file was modified.
