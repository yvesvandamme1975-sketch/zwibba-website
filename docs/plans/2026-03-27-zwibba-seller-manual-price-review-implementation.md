# Zwibba Seller Manual Price Review Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove AI price guidance from the seller review UI and make the seller review photo surfaces render as images or visual fallbacks instead of raw links.

**Architecture:** Keep the existing browser seller flow and draft model intact. Limit the change to the review rendering layer and its tests so the seller remains in control of the price while the primary photo stays visual-first.

**Tech Stack:** Static HTML/CSS/vanilla JS, Node test runner, Railway website deployment

---

### Task 1: Add failing review-screen tests for seller-owned pricing

**Files:**
- Modify: `tests/post-flow.test.mjs`
- Test: `tests/post-flow.test.mjs`

**Step 1: Write the failing test**

Add review-screen assertions that:
- the manual `Prix final (CDF)` field still renders
- `Fourchette IA` and AI price guidance no longer render

**Step 2: Run test to verify it fails**

Run: `node --test tests/post-flow.test.mjs`
Expected: FAIL because the review screen still renders AI price guidance.

**Step 3: Write minimal implementation**

Update the review screen to remove AI price guidance while keeping the existing manual price input and validation flow.

**Step 4: Run test to verify it passes**

Run: `node --test tests/post-flow.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/features/post/review-form-screen.mjs tests/post-flow.test.mjs
git commit -m "fix: remove ai price guidance from seller review"
```

### Task 2: Add failing review-screen tests for image-first photo rendering

**Files:**
- Modify: `tests/post-flow.test.mjs`
- Modify: `App/app.css`
- Modify: `App/features/post/review-form-screen.mjs`

**Step 1: Write the failing test**

Add review-screen assertions that:
- a primary photo source renders a hero `<img>`
- the photo metadata list does not print the raw URL as visible text
- missing primary photo sources render a visual fallback message

**Step 2: Run test to verify it fails**

Run: `node --test tests/post-flow.test.mjs`
Expected: FAIL because the review photo list still prints the URL and there is no visual fallback tile.

**Step 3: Write minimal implementation**

Update the review screen and CSS to:
- render human-readable photo status text
- render a fallback review hero when no image source exists
- preserve the current hero image behavior when a valid source exists

**Step 4: Run test to verify it passes**

Run: `node --test tests/post-flow.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/app.css App/features/post/review-form-screen.mjs tests/post-flow.test.mjs
git commit -m "fix: make seller review photo surfaces visual"
```

### Task 3: Verify and ship the browser review update

**Files:**
- Modify: `docs/deployment/2026-03-16-zwibba-railway-production.md`

**Step 1: Run targeted verification**

Run:
- `node --test tests/post-flow.test.mjs`
- `npm run smoke:app`

Expected: PASS

**Step 2: Deploy the website service**

Run:
- `railway up --service website`

**Step 3: Verify the live browser app**

Check:
- seller review no longer shows AI pricing guidance
- seller can still enter a manual price
- `Photo principale` is rendered as an image or a visual fallback, not a raw link

**Step 4: Commit**

```bash
git add docs/deployment/2026-03-16-zwibba-railway-production.md
git commit -m "docs: note seller review manual-price refresh"
```
