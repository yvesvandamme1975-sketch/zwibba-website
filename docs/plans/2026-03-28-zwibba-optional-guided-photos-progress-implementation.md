# Zwibba Optional Guided Photos and Upload Progress Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let sellers publish with one uploaded primary photo, keep guided photos as optional recommendations, and add visible staged upload progress to the browser seller flow.

**Architecture:** Keep the current browser-first upload pipeline and seller validation model. Change the publish gate to require only the primary uploaded photo, then add a small staged-progress state that capture and guidance screens can render without changing API contracts.

**Tech Stack:** Vanilla browser app modules, local draft storage, R2 signed uploads, Node test runner, Railway website deploy

---

### Task 1: Document and lock the seller beta rule

**Files:**
- Create: `docs/plans/2026-03-28-zwibba-optional-guided-photos-progress-design.md`
- Create: `docs/plans/2026-03-28-zwibba-optional-guided-photos-progress-implementation.md`
- Modify: `docs/plans/README.md`

**Step 1: Add the new design and plan docs**

Write the approved behavior:
- one uploaded primary photo is enough to publish
- guided prompts are optional
- staged progress replaces vague loading text

**Step 2: Update the plans index**

Add both new docs to `docs/plans/README.md`.

**Step 3: Commit**

```bash
git add docs/plans/2026-03-28-zwibba-optional-guided-photos-progress-design.md docs/plans/2026-03-28-zwibba-optional-guided-photos-progress-implementation.md docs/plans/README.md
git commit -m "docs: add optional guided photos plan"
```

### Task 2: Write failing seller-flow tests

**Files:**
- Modify: `tests/post-flow.test.mjs`

**Step 1: Write the failing tests**

Add tests for:
- publish validation succeeds without guided prompt photos when the primary photo is uploaded
- guidance screen copy makes guided prompts non-blocking
- guidance screen shows clear upload action labels
- staged progress UI renders the expected stage labels

**Step 2: Run the targeted tests to confirm failure**

Run:

```bash
node --test tests/post-flow.test.mjs
```

Expected:
- new assertions fail because current validation still blocks guided photos and no staged progress UI exists

**Step 3: Commit**

```bash
git add tests/post-flow.test.mjs
git commit -m "test: cover optional guided photos and upload stages"
```

### Task 3: Make guided photos non-blocking

**Files:**
- Modify: `App/features/post/post-flow-controller.mjs`

**Step 1: Update the publish validator**

Remove the missing-guided-photo blocker from `validateDraftForPublish(...)`.

**Step 2: Keep guided prompts available**

Do not remove `getGuidedPhotoPrompts(...)` or the existing guided-upload path.

**Step 3: Run tests**

Run:

```bash
node --test tests/post-flow.test.mjs
```

Expected:
- validation-related failures pass
- staged-progress/UI failures still fail

**Step 4: Commit**

```bash
git add App/features/post/post-flow-controller.mjs tests/post-flow.test.mjs
git commit -m "fix: allow seller publish with primary photo only"
```

### Task 4: Improve the guidance UI

**Files:**
- Modify: `App/features/post/photo-guidance-screen.mjs`
- Modify: `App/models/category-guidance.mjs`
- Modify: `App/app.css`

**Step 1: Update the copy**

Change the guidance screen so it says:
- seller can continue with the primary photo
- extra views improve confidence/moderation

**Step 2: Strengthen the upload actions**

Make the prompt action render as a clear button-style control with:
- `Ajouter cette photo`
- `Remplacer`
- `Réessayer`

**Step 3: Differentiate recommended guidance from blocking validation**

Keep the prompt list but remove blocking language from the status summary.

**Step 4: Run tests**

Run:

```bash
node --test tests/post-flow.test.mjs
```

Expected:
- guidance UI assertions pass
- staged-progress assertions may still fail

**Step 5: Commit**

```bash
git add App/features/post/photo-guidance-screen.mjs App/models/category-guidance.mjs App/app.css tests/post-flow.test.mjs
git commit -m "feat: soften guided photo beta UX"
```

### Task 5: Add staged upload progress

**Files:**
- Modify: `App/app.js`
- Modify: `App/features/post/capture-screen.mjs`
- Modify: `App/features/post/photo-guidance-screen.mjs`
- Modify: `App/app.css`

**Step 1: Add a small staged progress state**

Track the current seller upload stage in app state:
- first photo: `compressing`, `uploading`, `analyzing`
- guided photo: `compressing`, `uploading`, `complete`

**Step 2: Render the staged UI**

Show a compact stage list or bar in capture/guidance screens with the active stage highlighted.

**Step 3: Update handlers**

Set and clear the stage state during:
- `handleCapture(...)`
- `handleGuidedCapture(...)`

**Step 4: Run tests**

Run:

```bash
node --test tests/post-flow.test.mjs
npm run smoke:app
```

Expected:
- all targeted tests pass
- app build smoke stays green

**Step 5: Commit**

```bash
git add App/app.js App/features/post/capture-screen.mjs App/features/post/photo-guidance-screen.mjs App/app.css tests/post-flow.test.mjs
git commit -m "feat: add staged seller upload progress"
```

### Task 6: Deploy and verify the live seller flow

**Files:**
- Modify: none

**Step 1: Deploy the website**

Run:

```bash
railway up /Users/pc/zwibba-website-worktrees/browser-live --path-as-root -s website -d -m "feat: seller upload progress and optional guided photos"
```

**Step 2: Verify live behavior**

Check:
- the first photo shows staged progress
- guided prompt cards show clear upload actions
- seller can reach review/publish with only the primary photo

**Step 3: Record final validation**

Run or note:

```bash
node --test tests/post-flow.test.mjs
npm run smoke:app
```

**Step 4: Commit**

No new commit unless a live-only fix is required.
