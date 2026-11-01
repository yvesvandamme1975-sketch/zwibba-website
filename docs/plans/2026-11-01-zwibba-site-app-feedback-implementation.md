# Zwibba Site/App Feedback Implementation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correct confirmed site/app feedback without changing listings or the Instagram flow.
**Architecture:** Existing live-card renderer, static build, server and vanilla PWA.
**Tech Stack:** Node, JavaScript modules, node:test, existing Playwright.

## Task 1: Record scope
**Files:** Create the design/implementation pair and modify docs/plans/README.md.
Step 1: Add both documents to the index.
Step 2: Run: `git diff --check`. Expected: no whitespace errors.
Step 3: Commit: `git commit -m "docs: scope Xavier site and app feedback"`.

## Task 2: Fix confirmed public discovery defects
**Files:** Modify shared/live-listings.mjs, src/site/app.js, src/site/locales/fr-cd.mjs, scripts/build.mjs, server.mjs, src/site/styles.css, App/features/listings/listing-detail-screen.mjs and relevant tests.
Step 1: Add failing regressions for live currency, actual counts, readable server listing body, country context and default social image, then make minimal fixes.
Step 2: Run: `npm test && npm run build && npm run smoke:production-contracts`. Expected: all checks pass; record browser checks for mobile and USD filtering. Release smoke marker: `Contacter le vendeur dans la web app` in public listing HTML.
Step 3: Commit: `git commit -m "fix: align public discovery with live listings"`.

## Scope amendment — 1 November, full feedback mandate and review decision
Task 2 also covers the connected API/service/UI changes: apps/api/src/listings/{listings.service,listings.controller,reviews.service,review-eligibility,listing-thumbnail}.ts, API tests, App components/services/styles, the post review form and corresponding tests. The original first-batch scope is extended, not treated as a completed release. Reuse sharp; no migration or media overwrite.

Yves chose "Un message envoyé dans Zwibba". A buyer must send a message in the thread for this listing before submitting a review. Opening a thread, calling or using WhatsApp is insufficient. Both create and update pass the same check. The existing one-review-per-buyer/listing rule remains.

Additional Step 2 verification: `pnpm -C apps/api build && pnpm -C apps/api test`; expected all tests pass. Capture browser checks for price/locality/reset, responsive layout and no-JavaScript listing content. Red/green evidence is preserved outside the repository. Task 2 commit message remains unchanged.


## Task 3: Address the first cross-review findings locally
**Files:** Modify review eligibility, listing dates/image resolution and thumbnail HTTP headers/concurrency, app image fallback, site filter simplification, related API/UI tests.
Step 1: Cover detail eligibility (anonymous/owner/empty thread/seller-only/buyer message), factual dates, thumbnail HTTP outcomes and app original-photo fallback; correct the identified gaps. Keep the refused review record intact and do not automatically retry publication review.
Step 2: Run: `npm test && pnpm -C apps/api build && pnpm -C apps/api test && npm run smoke:production-contracts`. Expected: all checks pass. Browser check thumbnail success/fallback and preserve source excerpts for schema/chat role values.
Step 3: Commit: `git commit -m "fix: close listing review and thumbnail verification gaps"`.
