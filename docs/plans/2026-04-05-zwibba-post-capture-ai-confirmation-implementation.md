# Zwibba Post-Capture AI Confirmation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an explicit post-capture confirmation step that shows the uploaded first photo and AI-generated draft summary before the seller continues to guided photos or review.

**Architecture:** Keep the existing browser upload and AI pipeline. Add one new route and screen in the browser app, then route the first-photo success path through that screen.

**Tech Stack:** Vanilla browser app modules, Node test runner, Railway website deploy

---

### Task 1: Save the approved design

**Files:**
- Create: `docs/plans/2026-04-05-zwibba-post-capture-ai-confirmation-design.md`
- Create: `docs/plans/2026-04-05-zwibba-post-capture-ai-confirmation-implementation.md`
- Modify: `docs/plans/README.md`

**Step 1: Add the design and plan docs**

Capture the approved behavior:
- first uploaded photo lands on `#capture-result`
- photo and AI summary are shown in read-only mode
- CTA continues to `#guidance` or `#review`

**Step 2: Update the plans index**

Add both new docs to `docs/plans/README.md`.

### Task 2: Add failing tests

**Files:**
- Modify: `tests/post-flow.test.mjs`
- Modify: `tests/app-buyer-routing.test.mjs`

**Step 1: Add route coverage**

Add a test that `parseAppRoute('#capture-result')` returns `{ type: 'capture-result' }`.

**Step 2: Add confirmation-screen coverage**

Add tests for:
- AI-ready capture-result screen shows uploaded image and read-only summary fields
- manual fallback capture-result screen shows uploaded image and fallback copy
- CTA goes to `#guidance` when required guided photos remain
- CTA goes to `#review` when no required guided photos remain

**Step 3: Run the targeted tests and confirm failure**

```bash
node --test tests/post-flow.test.mjs tests/app-buyer-routing.test.mjs
```

### Task 3: Implement the new screen and route

**Files:**
- Create: `App/features/post/capture-result-screen.mjs`
- Modify: `App/app.js`
- Modify: `App/features/home/buyer-browse-controller.mjs`
- Modify: `App/app.css`

**Step 1: Add the render module**

Create a new screen that shows:
- uploaded hero image
- AI summary or fallback note
- continue CTA based on draft state

**Step 2: Recognize the route**

Update route parsing and route rendering so `#capture-result` is supported.

**Step 3: Change the first-photo success path**

Update `handleCapture(...)` to route to `#capture-result` after success instead of jumping directly to `#guidance` or `#review`.

**Step 4: Run tests**

```bash
node --test tests/post-flow.test.mjs tests/app-buyer-routing.test.mjs
npm run smoke:app
```

### Task 4: Verify and deploy

**Files:**
- Modify: none unless a live-only issue appears

**Step 1: Run a live browser smoke**

Check:
- first-photo upload lands on `#capture-result`
- uploaded image is visible
- AI summary or fallback note is visible
- CTA continues correctly

**Step 2: Deploy the website**

Deploy the website service on Railway once the browser app is green.
