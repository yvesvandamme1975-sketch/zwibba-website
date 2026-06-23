# Zwibba Seller Review Reply Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre au vendeur propriétaire de répondre publiquement (une réponse par avis) aux avis reçus, affichée sous l'avis sur son profil vendeur public.

**Architecture:** Champs `sellerReply`/`sellerReplyAt` sur `Review` (migration additive). Endpoint `POST /reviews/:reviewId/reply` (auth, autorisé au seul vendeur visé via `review.sellerPhoneNumber === session.phoneNumber`, texte validé par `normalizeReviewComment`). Projection `getPublicSeller` étendue (`id`, `sellerReply`, `sellerReplyAt`). Front : réponse affichée sous l'avis, formulaire inline quand le viewer est le vendeur, câblage `App/app.js`.

**Tech Stack:** NestJS API (injection `@Inject` explicite obligatoire), Prisma 6, TypeScript, custom node `--test` runner (`apps/api/scripts/run-tests.mjs`) ; PWA vanilla JS ESM (`App/`), `node --test tests/*.test.mjs`.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append to the current priority docs list in `docs/plans/README.md`, before the "Legacy docs" trailer:

```
- `2026-06-23-zwibba-seller-review-reply-design.md`
- `2026-06-23-zwibba-seller-review-reply-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "seller-review-reply" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index seller-review-reply plans"
```

---

### Task 2: Add reply columns to `Review` (additive migration)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260623140000_review_seller_reply/migration.sql`

**Step 1: Write the schema change and migration**

Add `sellerReply String?` and `sellerReplyAt DateTime?` to `model Review`. Migration SQL:

```sql
ALTER TABLE "Review" ADD COLUMN "sellerReply" TEXT;
ALTER TABLE "Review" ADD COLUMN "sellerReplyAt" TIMESTAMP(3);
```

**Step 2: Verify the Prisma client regenerates**

Run: `pnpm -C apps/api prisma:generate`
Expected: completes with "Generated Prisma Client" and no error; `rg -n "sellerReply" apps/api/prisma/schema.prisma` matches.

**Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260623140000_review_seller_reply/migration.sql
git commit -m "feat: add seller reply columns to Review"
```

---

### Task 3: Failing test — `POST /reviews/:reviewId/reply`

**Files:**
- Create: `apps/api/test/listings/review-reply.e2e-spec.ts`

**Step 1: Write the failing test**

Add tests asserting `POST /reviews/:reviewId/reply` (a) requires a session (401 without); (b) returns 404 for an unknown review id; (c) returns 403 when the session is not the reviewed seller (`session.phoneNumber !== review.sellerPhoneNumber`); (d) for the reviewed seller, persists `sellerReply` (cleaned) and a non-null `sellerReplyAt`; (e) a subsequent reply overwrites the previous one; (f) an empty reply clears `sellerReply` back to null.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- review-reply`
Expected: FAIL because the route does not exist.

**Step 3: Commit**

```bash
git add apps/api/test/listings/review-reply.e2e-spec.ts
git commit -m "test: expect seller reply endpoint with owner-only rule"
```

---

### Task 4: Implement the reply endpoint

**Files:**
- Create: `apps/api/src/listings/review-replies.controller.ts`
- Modify: `apps/api/src/listings/reviews.service.ts`
- Modify: `apps/api/src/listings/listings.module.ts`

**Step 1: Implement**

Add `ReviewRepliesController` (`@Controller('reviews')`, `POST :reviewId/reply`, `@UseGuards(SessionAuthGuard)`, `@Inject(ReviewsService)`), delegating to a new `ReviewsService.replyToReview({ reviewId, reply, session })`: load the review by `id` (404), throw `ForbiddenException` if `review.sellerPhoneNumber !== session.phoneNumber`, run `normalizeReviewComment(reply)` (a null/empty reply clears it), then update `sellerReply` and `sellerReplyAt = new Date()` (or null when cleared). Register the controller in `listings.module.ts`.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- review-reply`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/listings/review-replies.controller.ts apps/api/src/listings/reviews.service.ts apps/api/src/listings/listings.module.ts
git commit -m "feat: add seller reply endpoint"
```

---

### Task 5: Failing test — public seller exposes review id and reply

**Files:**
- Modify: `apps/api/test/profile/seller-public.e2e-spec.ts`

**Step 1: Write the failing test**

Extend the public seller test: after seeding a review with a seller reply, assert each entry in `seller`/`reviews` exposes `id`, `sellerReply`, and `sellerReplyAt`; a review without a reply exposes `sellerReply: null`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- seller-public`
Expected: FAIL because the projection omits `id`/`sellerReply`.

**Step 3: Commit**

```bash
git add apps/api/test/profile/seller-public.e2e-spec.ts
git commit -m "test: expect review id and seller reply in public projection"
```

---

### Task 6: Implement the extended public projection

**Files:**
- Modify: `apps/api/src/profile/profile.service.ts`

**Step 1: Implement**

Extend the reviews `.map` in `getPublicSeller` to include `id`, `sellerReply`, and `sellerReplyAt` in each returned entry, keeping the existing fields and the defensive access intact.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- seller-public`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/profile/profile.service.ts
git commit -m "feat: expose review id and seller reply on public profile"
```

---

### Task 7: Failing test — seller replies client service

**Files:**
- Create: `tests/seller-replies-service.test.mjs`

**Step 1: Write the failing test**

Add `node --test` cases for a not-yet-existing `createSellerRepliesService({ apiBaseUrl, fetchFn })` from `App/services/seller-replies-service.mjs` with `submitSellerReply({ reviewId, reply, session })`: POSTs to `${apiBaseUrl}/reviews/${reviewId}/reply` with the bearer header and JSON body, returns the parsed body, throws a parsed error on a non-ok response (mirror `App/services/reviews-service.mjs`).

**Step 2: Run test to verify it fails**

Run: `node --test tests/seller-replies-service.test.mjs`
Expected: FAIL because the module does not exist.

**Step 3: Commit**

```bash
git add tests/seller-replies-service.test.mjs
git commit -m "test: add seller replies client service"
```

---

### Task 8: Implement the seller replies client service

**Files:**
- Create: `App/services/seller-replies-service.mjs`

**Step 1: Implement**

Create `createSellerRepliesService({ apiBaseUrl, fetchFn = globalThis.fetch })` with `submitSellerReply`, reusing the error-parsing and `sessionHeaders` shape from `App/services/reviews-service.mjs`.

**Step 2: Run test to verify it passes**

Run: `node --test tests/seller-replies-service.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/services/seller-replies-service.mjs
git commit -m "feat: add seller replies client service"
```

---

### Task 9: Failing test — public screen renders reply and owner reply form

**Files:**
- Modify: `tests/seller-public-screen.test.mjs`

**Step 1: Write the failing test**

Extend `tests/seller-public-screen.test.mjs`: a review carrying `sellerReply` renders a "Réponse du vendeur" block with the reply text; when the rendering context marks the viewer as the seller (e.g. an `isOwner`/viewer-session prop), reviews without a reply render a reply form with `data-action="submit-seller-reply"` and the review's `data-review-id`; when the viewer is not the seller, no reply form is rendered.

**Step 2: Run test to verify it fails**

Run: `node --test tests/seller-public-screen.test.mjs`
Expected: FAIL because the reply block and form are not rendered.

**Step 3: Commit**

```bash
git add tests/seller-public-screen.test.mjs
git commit -m "test: expect seller reply display and owner reply form"
```

---

### Task 10: Implement reply display and owner reply form

**Files:**
- Modify: `App/features/profile/seller-public-screen.mjs`

**Step 1: Implement**

Extend `renderReviewCard` to show the seller reply under the comment when present (labelled block + formatted date), and to render a reply form (`data-action="submit-seller-reply"`, `data-review-id`) for un-replied reviews when the render props mark the viewer as the seller. Thread the owner flag from `renderSellerPublicScreen` props. Keep existing markup intact and rendering light.

**Step 2: Run test to verify it passes**

Run: `node --test tests/seller-public-screen.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/features/profile/seller-public-screen.mjs
git commit -m "feat: render seller reply and owner reply form"
```

---

### Task 11: Wire the seller reply action in the app

**Files:**
- Modify: `App/app.js`

**Step 1: Implement**

Add a `submit-seller-reply` action handler that reads the reply text and `data-review-id`, calls `sellerRepliesService.submitSellerReply({ reviewId, reply, session: state.session })`, and on success reloads the current public seller view and re-renders; on error surfaces the parsed message. Instantiate `sellerRepliesService` from `createSellerRepliesService` alongside the existing services, and pass the owner flag (session phone matches the displayed seller) into the seller public render.

**Step 2: Verify the handler is wired**

Run: `rg -n "submit-seller-reply|sellerRepliesService|createSellerRepliesService" App/app.js`
Expected: a `submit-seller-reply` handler that calls `sellerRepliesService.submitSellerReply` and an instantiation via `createSellerRepliesService`.

**Step 3: Commit**

```bash
git add App/app.js
git commit -m "feat: wire seller reply submission in app"
```

---

### Task 12: Final cross-cutting verification

**Files:**
- None (verification only)

**Step 1: Run the full API and App suites plus the app build smoke**

Run: `pnpm -C apps/api test && node --test tests/*.test.mjs && npm run smoke:app`
Expected: all API tests PASS, all App tests PASS, and `smoke:app` builds `dist/` with the expected artifacts.

**Step 2: Confirm owner-only enforcement is server-side**

Run: `rg -n "sellerPhoneNumber !== session.phoneNumber|ForbiddenException" apps/api/src/listings/reviews.service.ts`
Expected: the reply path rejects non-seller sessions server-side, independent of the client owner flag.

**Step 3:** Skip the commit step for this task because no file was modified.
