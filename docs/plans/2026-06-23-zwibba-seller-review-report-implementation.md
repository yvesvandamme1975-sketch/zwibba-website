# Zwibba Review Report Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre de signaler un avis abusif/faux, faire remonter les signalements dans une file admin, et offrir au modérateur de rejeter le signalement ou supprimer l'avis.

**Architecture:** Modèle `ReviewReport` (migration additive, `@@unique([reviewId, reporterUserId])`). Endpoint signalement `POST /reviews/:reviewId/report` (auth, raison fermée, upsert). Endpoints admin internes `GET /review-reports/queue`, `POST /review-reports/:id/dismiss`, `POST /review-reports/:id/remove-review` (modèle `moderation.controller`, non gardés, accès Prisma défensif). App admin : `review-reports-page.ts` + routage `server.ts`. PWA : bouton « Signaler » + sélecteur de raison sur l'avis, câblage `App/app.js`.

**Tech Stack:** NestJS API (injection `@Inject` explicite obligatoire), Prisma 6, TypeScript, custom node `--test` runner ; app admin Node TS (`apps/admin`, `pnpm -C apps/admin test`) ; PWA vanilla JS ESM (`App/`, `node --test`). Ce plan suppose `seller-review-reply` déjà livré (l'`id` d'avis est exposé publiquement).

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append to the current priority docs list in `docs/plans/README.md`, before the "Legacy docs" trailer:

```
- `2026-06-23-zwibba-seller-review-report-design.md`
- `2026-06-23-zwibba-seller-review-report-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "seller-review-report" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index seller-review-report plans"
```

---

### Task 2: Add the `ReviewReport` model (additive migration)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260623150000_review_report/migration.sql`

**Step 1: Write the schema change and migration**

Add `model ReviewReport` with `id String @id @default(cuid())`, `review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)`, `reviewId String`, `reporter User @relation("UserReviewReports", fields: [reporterUserId], references: [id], onDelete: Cascade)`, `reporterUserId String`, `reason String`, `status String @default("pending")`, `createdAt DateTime @default(now())`, `@@unique([reviewId, reporterUserId])`, `@@index([status])`. Add inverse relations `reports ReviewReport[]` on `Review` and `reports ReviewReport[] @relation("UserReviewReports")` on `User`. Migration SQL:

```sql
CREATE TABLE "ReviewReport" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReviewReport_reviewId_reporterUserId_key" ON "ReviewReport"("reviewId", "reporterUserId");
CREATE INDEX "ReviewReport_status_idx" ON "ReviewReport"("status");
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Step 2: Verify the Prisma client regenerates**

Run: `pnpm -C apps/api prisma:generate`
Expected: completes with "Generated Prisma Client"; `rg -n "model ReviewReport" apps/api/prisma/schema.prisma` matches.

**Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260623150000_review_report/migration.sql
git commit -m "feat: add ReviewReport model"
```

---

### Task 3: Failing test — `POST /reviews/:reviewId/report`

**Files:**
- Create: `apps/api/test/listings/review-report.e2e-spec.ts`

**Step 1: Write the failing test**

Add tests asserting `POST /reviews/:reviewId/report` (a) requires a session (401); (b) returns 404 for an unknown review id; (c) returns 400 for a reason outside `{spam, offensive, fake, other}`; (d) creates a `pending` report for a valid session+reason; (e) a second report by the same user for the same review UPDATES the existing row (no duplicate) via the unique constraint.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- review-report`
Expected: FAIL because the route does not exist.

**Step 3: Commit**

```bash
git add apps/api/test/listings/review-report.e2e-spec.ts
git commit -m "test: expect review report endpoint with reason and dedupe rules"
```

---

### Task 4: Implement the report endpoint

**Files:**
- Create: `apps/api/src/listings/review-reports.controller.ts`
- Create: `apps/api/src/listings/review-reports.service.ts`
- Modify: `apps/api/src/listings/listings.module.ts`

**Step 1: Implement**

Add `ReviewReportsController` (`@Controller('reviews')`, `POST :reviewId/report`, `@UseGuards(SessionAuthGuard)`, `@Inject(ReviewReportsService)`) delegating to `ReviewReportsService.reportReview({ reviewId, reason, session })`: load the review (404), validate `reason` against the allowed set (400 otherwise), resolve `reporterUserId` from the session, `upsert` on `{ reviewId_reporterUserId }`. Register the controller and service in `listings.module.ts`. Use explicit `@Inject(PrismaService)` in the service.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- review-report`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/listings/review-reports.controller.ts apps/api/src/listings/review-reports.service.ts apps/api/src/listings/listings.module.ts
git commit -m "feat: add review report endpoint"
```

---

### Task 5: Failing test — admin review-reports queue and resolve endpoints

**Files:**
- Create: `apps/api/test/listings/review-reports-admin.e2e-spec.ts`

**Step 1: Write the failing test**

Add tests asserting (a) `GET /review-reports/queue` returns only `pending` reports, each joined to its review context (review id, comment excerpt, rating, seller, reason, createdAt); (b) `POST /review-reports/:reportId/dismiss` sets the report status to `dismissed` and removes it from the queue; (c) `POST /review-reports/:reportId/remove-review` deletes the targeted review (and, via cascade, its reports), so the queue no longer lists it.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- review-reports-admin`
Expected: FAIL because the admin routes do not exist.

**Step 3: Commit**

```bash
git add apps/api/test/listings/review-reports-admin.e2e-spec.ts
git commit -m "test: expect admin review-reports queue and resolve actions"
```

---

### Task 6: Implement the admin review-reports endpoints

**Files:**
- Create: `apps/api/src/listings/review-reports-admin.controller.ts`
- Modify: `apps/api/src/listings/review-reports.service.ts`
- Modify: `apps/api/src/listings/listings.module.ts`

**Step 1: Implement**

Add `ReviewReportsAdminController` (`@Controller('review-reports')`, no auth guard — mirror `moderation.controller`): `GET queue`, `POST :reportId/dismiss`, `POST :reportId/remove-review`. Add `listQueue`, `dismiss`, `removeReview` to `ReviewReportsService` with defensive Prisma access (`reviewReport?.findMany?.()`, `review?.delete?.()`). Register the controller in `listings.module.ts`.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- review-reports-admin`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/listings/review-reports-admin.controller.ts apps/api/src/listings/review-reports.service.ts apps/api/src/listings/listings.module.ts
git commit -m "feat: add admin review-reports queue and resolve endpoints"
```

---

### Task 7: Failing test — admin review-reports page render

**Files:**
- Create: `apps/admin/test/review-reports-page.test.ts`

**Step 1: Write the failing test**

Add tests for a not-yet-existing `renderReviewReportsPage({ items })` from `apps/admin/src/moderation/review-reports-page.ts` (mirror `apps/admin/test/moderation-page.test.ts`): renders one block per report with the review excerpt, reason, and two forms posting to `/review-reports/:id/dismiss` and `/review-reports/:id/remove-review`; renders an empty state when `items` is empty; escapes HTML.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/admin test -- review-reports-page`
Expected: FAIL because the module does not exist.

**Step 3: Commit**

```bash
git add apps/admin/test/review-reports-page.test.ts
git commit -m "test: add admin review-reports page render"
```

---

### Task 8: Implement the admin page and wire it into the server

**Files:**
- Create: `apps/admin/src/moderation/review-reports-page.ts`
- Modify: `apps/admin/src/server.ts`

**Step 1: Implement**

Create `renderReviewReportsPage` mirroring `moderation-page.ts`. In `apps/admin/src/server.ts`, add loading of the queue via `fetch ${apiBaseUrl}/review-reports/queue`, a `/review-reports` GET route rendering the page, and POST routing for `/review-reports/:id/dismiss` and `/review-reports/:id/remove-review` to the API, plus a link to the new page in the existing navigation.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/admin test -- review-reports-page`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/admin/src/moderation/review-reports-page.ts apps/admin/src/server.ts
git commit -m "feat: add admin review-reports page"
```

---

### Task 9: Failing test — report client service

**Files:**
- Create: `tests/review-reports-service.test.mjs`

**Step 1: Write the failing test**

Add `node --test` cases for a not-yet-existing `createReviewReportsService({ apiBaseUrl, fetchFn })` from `App/services/review-reports-service.mjs` with `reportReview({ reviewId, reason, session })`: POSTs to `${apiBaseUrl}/reviews/${reviewId}/report` with the bearer header and JSON body, returns the parsed body, throws a parsed error on a non-ok response (mirror `App/services/reviews-service.mjs`).

**Step 2: Run test to verify it fails**

Run: `node --test tests/review-reports-service.test.mjs`
Expected: FAIL because the module does not exist.

**Step 3: Commit**

```bash
git add tests/review-reports-service.test.mjs
git commit -m "test: add review reports client service"
```

---

### Task 10: Implement the report client service

**Files:**
- Create: `App/services/review-reports-service.mjs`

**Step 1: Implement**

Create `createReviewReportsService({ apiBaseUrl, fetchFn = globalThis.fetch })` with `reportReview`, reusing the error-parsing and `sessionHeaders` shape from `App/services/reviews-service.mjs`.

**Step 2: Run test to verify it passes**

Run: `node --test tests/review-reports-service.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/services/review-reports-service.mjs
git commit -m "feat: add review reports client service"
```

---

### Task 11: Failing test — report button on the review card

**Files:**
- Modify: `tests/seller-public-screen.test.mjs`

**Step 1: Write the failing test**

Extend `tests/seller-public-screen.test.mjs`: for a verified viewer who is neither the review author nor the seller, each review card renders a report control with `data-action="report-review"` and the review's `data-review-id`; for the seller or the review's own author, the report control is absent.

**Step 2: Run test to verify it fails**

Run: `node --test tests/seller-public-screen.test.mjs`
Expected: FAIL because the report control is not rendered.

**Step 3: Commit**

```bash
git add tests/seller-public-screen.test.mjs
git commit -m "test: expect report control on review cards"
```

---

### Task 12: Implement the report control

**Files:**
- Modify: `App/features/profile/seller-public-screen.mjs`

**Step 1: Implement**

Extend `renderReviewCard` to render a "Signaler" control (`data-action="report-review"`, `data-review-id`) with a reason selector, shown only for a verified non-author non-seller viewer (thread the needed flags from `renderSellerPublicScreen` props). Keep existing markup intact.

**Step 2: Run test to verify it passes**

Run: `node --test tests/seller-public-screen.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/features/profile/seller-public-screen.mjs
git commit -m "feat: render report control on review cards"
```

---

### Task 13: Wire the report action in the app

**Files:**
- Modify: `App/app.js`

**Step 1: Implement**

Add a `report-review` action handler that reads `data-review-id` and the chosen reason, calls `reviewReportsService.reportReview({ reviewId, reason, session: state.session })`, and on success shows a confirmation and re-renders; on error surfaces the parsed message. Instantiate `reviewReportsService` from `createReviewReportsService` alongside the existing services.

**Step 2: Verify the handler is wired**

Run: `rg -n "report-review|reviewReportsService|createReviewReportsService" App/app.js`
Expected: a `report-review` handler that calls `reviewReportsService.reportReview` and an instantiation via `createReviewReportsService`.

**Step 3: Commit**

```bash
git add App/app.js
git commit -m "feat: wire review reporting in app"
```

---

### Task 14: Final cross-cutting verification

**Files:**
- None (verification only)

**Step 1: Run the API, admin, and App suites plus the app build smoke**

Run: `pnpm -C apps/api test && pnpm -C apps/admin test && node --test tests/*.test.mjs && npm run smoke:app`
Expected: all API tests PASS, all admin tests PASS, all App tests PASS, and `smoke:app` builds `dist/`.

**Step 2: Confirm admin resolution closes the loop and access is defensive**

Run: `rg -n "remove-review|dismiss|reviewReport\?\.|review\?\.delete" apps/api/src/listings/review-reports.service.ts`
Expected: the service exposes dismiss + remove-review and uses defensive Prisma access throughout.

**Step 3:** Skip the commit step for this task because no file was modified.
