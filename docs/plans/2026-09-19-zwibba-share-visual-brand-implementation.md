> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver Xavier's 18 September corrections: no story entry on listings, branded "Je vends sur Zwibba" link visual on Instagram/WhatsApp/Facebook cards.
**Architecture:** Remove story access from the listing menu; render a versioned branded JPEG for `og:image`; bounded, dry-run-first regeneration of older listings.
**Tech Stack:** Vanilla JavaScript, Node tests, NestJS + sharp, Prisma, R2.

Release rule for this plan: no auto-deploy. Commits, preview image and dry-run report are handed to the owner and the reviewing agent before any push, PR or production write.

### Task 1: Record the case design
**Files:** Create this pair; Modify `docs/plans/README.md`.
Step 1: Add this pair to the index. Client screenshots stay outside the repository.
Step 2: Run: `git diff --check`. Expected: clean.
Step 3: Commit: `git commit -m "docs: scope share visual brand corrections"`.

### Task 2: Remove story access from the listing share menu, keep it on the success screen
**Files:** Modify `App/features/listings/listing-detail-screen.mjs`, `App/components/share-menu.mjs`, `App/services/listing-share.mjs`, `App/app.js`, `App/features/post/success-screen.mjs` (adds `data-share-context="success"` only), `tests/listing-detail-screen.test.mjs`, `tests/share-menu.test.mjs`, `tests/listing-share.test.mjs`, `tests/success-screen.test.mjs`.
Step 1: Failing tests: the listing detail renders one share entry and never `data-share-mode="story"`, "Partager en story" or `data-share-context="success"`; the sheet without `storyEnabled` shows no mode toggle nor story-only option whatever `mode` or `imageStatus`; with `storyEnabled: true` the toggle and the story options behave exactly as before (non-regression); the controller ignores a story request unless `storyEnabled`; the success screen declares `data-share-context="success"`. Then remove `storyButton`, gate the sheet and the controller on `storyEnabled`, and pass `storyEnabled: trigger.dataset.shareContext === 'success'` from `App/app.js`.
Step 2: Run: `node --test tests/listing-detail-screen.test.mjs tests/share-menu.test.mjs tests/listing-share.test.mjs tests/success-screen.test.mjs`. Expected: all pass after correction (56 tests).
Step 3: Commit: `git commit -m "fix(app): remove story sharing entry from listing menu"`.

### Task 3: Branded, versioned, content-addressed link visual
**Files:** Modify `apps/api/src/share/compose-story-image.ts`, `apps/api/src/share/story-image.service.ts`, `shared/listing-og.mjs`, `apps/api/test/share/compose-story-image.test.ts`, `apps/api/test/share/story-image.service.test.ts`, `tests/listing-og.test.mjs`.
Step 1: Failing tests: `composeLinkImage` returns a 1200x630 JPEG under 300 000 bytes (also for a noisy photo), the lockup SVG reads "Je vends sur Zwibba", `linkImageLayout` keeps the photo aspect ratio and both photo and lockup inside the central 630x630 square, EXIF orientation 6/8 photos are laid out portrait and never stretched (pixel assertions); the service uploads `listings/<id>/share-v2-<16 hex>.jpg` with `image/jpeg`, derived from the bytes, and `hasCurrentLinkImage` recognises only that shape; `og:image:type` is declared. Then implement.
Step 2: Run: `pnpm -C apps/api test "test/share/"` and `node --test tests/listing-og.test.mjs`. Expected: all pass.
Step 3: Commit: `git commit -m "feat(share): brand the link preview with the Je vends sur Zwibba lockup"`.

### Task 4: Link-only regeneration, bounded backfill, write-ahead manifest, rollback
**Files:** Modify `apps/api/src/share/story-image.service.ts`, `apps/api/test/share/story-image.service.test.ts`; Create `apps/api/scripts/backfill-share-images-runner.ts`, `apps/api/scripts/backfill-share-images.ts`, `apps/api/test/share/backfill-share-images.test.ts`.
Step 1: Failing tests: `generateLinkImageForListing` uploads only the link image (never `story.png`), refuses listings that are not publicly visible (pending, sold, paused, deleted_by_seller, `deletedBySellerAt`) before any upload, compare-and-sets on `updatedAt` + previous `shareImageUrl` + approved/active/not-deleted while preserving `updatedAt`, and a concurrent change leaves the referenced object and the database URL untouched. Runner: selection keeps only publicly visible listings without the current preview, bounded by `--limit`; dry-run never calls the regenerator nor persists; apply calls it once per planned listing, isolates failures, and persists the manifest before the first write then after every result; rollback restores a previous URL only where the database still points at what the backfill wrote. Then implement.
Step 2: Run: `pnpm -C apps/api test "test/share/"`. Expected: pass. Then `pnpm -C apps/api exec tsx scripts/backfill-share-images.ts --limit 50` against the configured database (`DATABASE_URL`). Expected: a dry-run report, zero writes.
Step 3: Commit: `git commit -m "feat(share): bounded backfill of branded link previews"`.

### Task 5: Full verification and hand-off
Step 1: Run `npm test`, `pnpm -C apps/api test`, `npm run build`, `npm run smoke:production-contracts` (with a non-production `NODE_ENV`, since `server.mjs` fails closed without `ZWIBBA_API_BASE_URL` in production). Generate the preview JPEG and its simulated square crop from the sandwich listing photo for owner review, outside Git.
Step 2: Expected: all pass, `git status --short` empty, preview and dry-run report paths reported to the owner and reviewer. Smoke marker after release: `Partager en story` absent from the website bundle; `og:image` of `/annonce/sandwich-poulet-tomate-oignon/` matches `share-v2-[0-9a-f]{16}\.jpg` after the applied backfill.
Step 3: No commit; hand-off for review. Release only after explicit owner validation, following `docs/operations/git-and-releases.md`.
