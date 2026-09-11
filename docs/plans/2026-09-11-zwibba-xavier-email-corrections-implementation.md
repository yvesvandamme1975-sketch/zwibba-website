> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the authorized Zwibba corrections from the owner's email.
**Architecture:** Reuse the existing UI, sharing controller, client authentication and release process.
**Tech Stack:** Vanilla JavaScript, Node tests, Playwright, Railway.

### Task 1: Record the case design
**Files:** Create this pair; Modify `docs/plans/README.md`.
Step 1: Add this pair to the index; keep private screenshots outside the repository.
Step 2: Run: `git diff --check`. Expected: clean.
Step 3: Commit: `git commit -m "docs: scope Xavier email correction pilot"`.

### Task 2: Make native sharing the primary action
**Files:** Modify `App/services/listing-share.mjs`, `App/components/share-menu.mjs`, `App/features/listings/listing-detail-screen.mjs`, `App/app.js`, `tests/listing-share.test.mjs`, `tests/share-menu.test.mjs`, `tests/listing-detail-screen.test.mjs`.
Step 1: Add failing tests for immediate native entry, cancellation, unsupported fallback, a separate story action, and removal of network shortcuts. Implement only those behaviors after observing failure.
Step 2: Run: `node --test tests/listing-share.test.mjs tests/share-menu.test.mjs tests/listing-detail-screen.test.mjs`. Expected: all pass after correction.
Step 3: Commit: `git commit -m "fix: open native sharing from listing actions"`.

### Task 3: Verify messaging and the complete delivery
**Files:** Messaging files to be identified by the ongoing read-only reproduction before implementation; append the demonstrated cause and exact checks here.
Step 1: Reproduce seller messaging without sending a real message. Add a scoped regression only for a demonstrated defect. Complete a browser check of link/story sharing and error recovery. Keep phone share target publication unclaimed until observed on that phone.
Step 2: Run: `npm test`, `npm run build`, `npm run smoke:production-contracts`. Expected: all pass. Release smoke marker: `Partager en story` in the website bundle, plus actual changed route inspection.
Step 3: Commit the scoped messaging correction with its message recorded when its cause is established, then follow `docs/operations/git-and-releases.md` for review, CI and delivery verification.

Messaging diagnosis: `openThreadFromListing` allowed rejected POST requests to escape without feedback. The exact server error on Xavier's phone remains unknown. Add a small tested request helper, busy/error rendering, session-expiry reauthentication, and an explicit terms recovery link. Verify failure, retry, duplicate taps, malformed response and success using synthetic services only. Files: `App/services/thread-start.mjs`, `App/app.js`, `App/features/listings/listing-detail-screen.mjs`, `tests/thread-start.test.mjs`, listing detail tests. Commit: `fix: surface and recover conversation creation failures`.
