# Zwibba Browser Real Seller Upload Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the browser seller demo-photo flow with real browser image selection and mobile camera capture, uploading each seller photo immediately to R2 and reusing the persisted draft through publish.

**Architecture:** Reuse the existing live browser media path instead of adding a second upload stack. The browser app should accept a real `File`, create a temporary preview, request a signed upload URL, upload the file immediately, persist the uploaded photo into the draft, and then let review and publish operate on already-uploaded draft media only.

**Tech Stack:** Static HTML/CSS/vanilla JS, Node test runner, Railway website deployment, Railway API, Postgres, Cloudflare R2

---

### Task 1: Replace seller capture presets with a real first-photo entry

**Files:**
- Modify: `App/features/post/capture-screen.mjs`
- Modify: `App/app.js`
- Test: `tests/post-flow.test.mjs`

**Step 1: Write the failing test**

Add browser tests that expect:
- the capture screen renders a real file input or trigger for the first photo
- the old seller demo preset cards are not rendered as the capture mechanism
- the first photo action advertises image picker or camera capture semantics

**Step 2: Run test to verify it fails**

Run: `node --test tests/post-flow.test.mjs`
Expected: FAIL because the current screen still renders demo preset cards.

**Step 3: Write minimal implementation**

Update the capture screen and event wiring to:
- render a real first-photo control using `accept="image/*"` and `capture="environment"`
- remove seller demo preset cards from the live flow
- keep the rest of the seller route structure intact

**Step 4: Run test to verify it passes**

Run: `node --test tests/post-flow.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/features/post/capture-screen.mjs App/app.js tests/post-flow.test.mjs
git commit -m "feat: use real seller first-photo input"
```

### Task 2: Add failing tests for immediate real-photo upload state

**Files:**
- Modify: `tests/post-flow.test.mjs`
- Modify: `tests/live-publish-flow.test.mjs`

**Step 1: Write the failing test**

Add tests that expect:
- selecting a first real file creates a draft photo entry with upload state
- a successful upload transitions the first photo to `uploaded`
- a failed upload leaves the photo in a retryable `failed` state

**Step 2: Run test to verify it fails**

Run: `node --test tests/post-flow.test.mjs tests/live-publish-flow.test.mjs`
Expected: FAIL because the current controller does not model real file uploads.

**Step 3: Write minimal implementation**

Do not write production code yet beyond the smallest scaffolding needed for the tests to bind to the new upload state shape.

**Step 4: Run test to verify it still fails correctly**

Run: `node --test tests/post-flow.test.mjs tests/live-publish-flow.test.mjs`
Expected: FAIL because the upload behavior is not implemented yet, but the failure should now be about missing upload transitions rather than missing selectors.

**Step 5: Commit**

```bash
git add tests/post-flow.test.mjs tests/live-publish-flow.test.mjs
git commit -m "test: cover browser seller upload states"
```

### Task 3: Implement immediate first-photo upload through the existing media stack

**Files:**
- Modify: `App/features/post/post-flow-controller.mjs`
- Modify: `App/models/listing-draft.mjs`
- Modify: `App/services/media-service.mjs`
- Test: `tests/post-flow.test.mjs`
- Test: `tests/live-publish-flow.test.mjs`

**Step 1: Write the failing test**

Add or tighten tests that expect:
- the controller accepts a real `File`
- it requests a signed upload URL
- it uploads immediately
- it stores uploaded photo metadata on the draft

**Step 2: Run test to verify it fails**

Run: `node --test tests/post-flow.test.mjs tests/live-publish-flow.test.mjs`
Expected: FAIL because the controller still expects demo photo inputs.

**Step 3: Write minimal implementation**

Update the controller and draft model to:
- accept real `File` objects for seller photos
- create temporary preview URLs
- request upload slots through the existing media service
- upload immediately
- persist `uploaded` or `failed` state on the draft photo

**Step 4: Run test to verify it passes**

Run: `node --test tests/post-flow.test.mjs tests/live-publish-flow.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/features/post/post-flow-controller.mjs App/models/listing-draft.mjs App/services/media-service.mjs tests/post-flow.test.mjs tests/live-publish-flow.test.mjs
git commit -m "feat: upload seller first photo immediately"
```

### Task 4: Wire guided-photo uploads and retry states

**Files:**
- Modify: `App/features/post/photo-guidance-screen.mjs`
- Modify: `App/features/post/post-flow-controller.mjs`
- Modify: `App/app.js`
- Modify: `App/app.css`
- Test: `tests/post-flow.test.mjs`

**Step 1: Write the failing test**

Add tests that expect:
- each guided `Ajouter` action maps to a real file input flow
- required prompts only become complete when their upload succeeds
- failed uploads show retry UI and do not complete the prompt

**Step 2: Run test to verify it fails**

Run: `node --test tests/post-flow.test.mjs`
Expected: FAIL because guided prompts still assume mock photo insertion.

**Step 3: Write minimal implementation**

Update the guided screen and controller wiring to:
- open real file selection per prompt
- render uploading, uploaded, and failed states
- keep retry available for failed uploads
- preserve the existing guided-step layout and copy as much as possible

**Step 4: Run test to verify it passes**

Run: `node --test tests/post-flow.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/features/post/photo-guidance-screen.mjs App/features/post/post-flow-controller.mjs App/app.js App/app.css tests/post-flow.test.mjs
git commit -m "feat: add guided seller photo uploads"
```

### Task 5: Make review and publish reuse uploaded photos only

**Files:**
- Modify: `App/features/post/review-form-screen.mjs`
- Modify: `App/features/post/live-publish-flow.mjs`
- Modify: `tests/live-publish-flow.test.mjs`
- Modify: `tests/publish-gate.test.mjs`

**Step 1: Write the failing test**

Add tests that expect:
- review renders the uploaded draft photo state only
- publish blocks when a required photo is pending or failed
- publish does not re-upload photos already marked `uploaded`

**Step 2: Run test to verify it fails**

Run: `node --test tests/live-publish-flow.test.mjs tests/publish-gate.test.mjs`
Expected: FAIL because review and publish still allow the older seller media assumptions.

**Step 3: Write minimal implementation**

Update review and publish to:
- consume the uploaded draft photo records
- block pending or failed required photos
- skip re-uploading photos that already have persisted uploaded metadata

**Step 4: Run test to verify it passes**

Run: `node --test tests/live-publish-flow.test.mjs tests/publish-gate.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/features/post/review-form-screen.mjs App/features/post/live-publish-flow.mjs tests/live-publish-flow.test.mjs tests/publish-gate.test.mjs
git commit -m "feat: publish using uploaded seller photos"
```

### Task 6: Verify, deploy, and run a public real-upload check

**Files:**
- Modify: `docs/deployment/2026-03-16-zwibba-railway-production.md`

**Step 1: Write the failing test**

Add or tighten tests that expect:
- seller upload flow remains routable from `#home`
- seller success still routes to the in-app listing detail screen

**Step 2: Run test to verify it fails**

Run: `node --test tests/post-flow.test.mjs tests/publish-gate.test.mjs`
Expected: FAIL until the new upload-aware seller path is fully wired.

**Step 3: Write minimal implementation**

Run the full verification and deploy the browser app update to Railway, then perform a real browser check using an actual image file through:
- `https://website-production-7a12.up.railway.app/App/#home`

Verify:
- first real photo upload succeeds
- required guided uploads succeed
- review shows the uploaded images
- publish succeeds without re-uploading
- success and buyer detail show the uploaded image

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/post-flow.test.mjs tests/live-publish-flow.test.mjs tests/publish-gate.test.mjs`
- `npm run smoke:app`

Expected: PASS

**Step 5: Commit**

```bash
git add docs/deployment/2026-03-16-zwibba-railway-production.md
git commit -m "feat: ship browser real seller uploads"
```
