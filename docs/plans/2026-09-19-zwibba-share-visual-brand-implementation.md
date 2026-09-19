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

### Task 2: Remove story access from the listing share menu
**Files:** Modify `App/features/listings/listing-detail-screen.mjs`, `App/components/share-menu.mjs`, `App/app.js`, `tests/listing-detail-screen.test.mjs`, `tests/share-menu.test.mjs`.
Step 1: Turn the story assertions into their negation: no `data-share-mode="story"`, no "Partager en story", no `share-mode-story` toggle, no story-only options in the sheet; keep the link options and the native entry. Observe the failures, then remove `storyButton`, the segmented control, the story-only options and the dead mode handler in `App/app.js`.
Step 2: Run: `node --test tests/listing-detail-screen.test.mjs tests/share-menu.test.mjs tests/listing-share.test.mjs`. Expected: all pass after correction.
Step 3: Commit: `git commit -m "fix(app): remove story sharing entry from listing menu"`.

### Task 3: Branded, versioned link visual
**Files:** Modify `apps/api/src/share/compose-story-image.ts`, `apps/api/src/share/story-image.service.ts`, `shared/listing-og.mjs`, `apps/api/test/share/compose-story-image.test.ts`, `apps/api/test/share/story-image.service.test.ts`, `tests/listing-og.test.mjs`.
Step 1: Failing tests: `composeLinkImage` returns a 1200x630 JPEG under 300 000 bytes and its label SVG contains "Je vends sur"; the service uploads `listings/<id>/share-v2.jpg` with `image/jpeg` and stores that URL; `og:image:type` is `image/jpeg` for `.jpg` share images. Then implement.
Step 2: Run: `pnpm -C apps/api test share` and `node --test tests/listing-og.test.mjs`. Expected: all pass.
Step 3: Commit: `git commit -m "feat(share): brand the link preview with the Je vends sur Zwibba lockup"`.

### Task 4: Bounded backfill script with dry-run default
**Files:** Create `apps/api/scripts/backfill-share-images.ts`, `apps/api/test/share/backfill-share-images.test.ts`.
Step 1: Failing test on the pure selection/plan function: approved listings without `shareImageUrl` or without `share-v2` are selected, `--limit` bounds the batch, dry-run returns the plan without calling the regenerator, `--apply` calls it once per listing and reports before/after. Then implement with Prisma and `ModerationService.regenerateStory` semantics (updatedAt preserved).
Step 2: Run: `pnpm -C apps/api test backfill`. Expected: pass. Then `pnpm -C apps/api exec tsx scripts/backfill-share-images.ts --dry-run --limit 50` against the configured database. Expected: a report, zero writes.
Step 3: Commit: `git commit -m "feat(share): bounded backfill of branded link previews"`.

### Task 5: Full verification and hand-off
Step 1: Run `npm test`, `pnpm -C apps/api test`, `npm run build`, `npm run smoke:production-contracts`. Generate the preview JPEG from the sandwich listing photo for owner review, outside Git.
Step 2: Expected: all pass, `git status --short` empty, preview and dry-run report paths reported to the owner and reviewer. Smoke marker after release: `Partager en story` absent from the website bundle; `og:image` of `/annonce/sandwich-poulet-tomate-oignon/` ends with `share-v2.jpg` after the applied backfill.
Step 3: No commit; hand-off for review. Release only after explicit owner validation, following `docs/operations/git-and-releases.md`.
