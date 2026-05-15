# Zwibba Sell Tab Scroll-To-Top Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the persistent `Vendre` tab always return the seller experience to the top of the page.

**Architecture:** Add a dedicated marker to the `Vendre` nav item and a small one-shot scroll-reset utility consumed by `renderApp()`. The existing route preservation behavior remains intact except when a seller-tab reset has been explicitly requested.

**Tech Stack:** Vanilla JavaScript modules, Node test runner, hash-based routing.

---

### Task 1: Mark the seller tab as a scroll-reset trigger

**Files:**
- Modify: `App/components/app-tab-shell.mjs`
- Test: `tests/app-tab-shell.test.mjs`

**Step 1: Write the failing test**

Add an assertion that the rendered `Vendre` tab includes a dedicated scroll-reset marker such as `data-scroll-top-target="sell"`.

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-tab-shell.test.mjs`

Expected: FAIL because the marker does not exist yet.

**Step 3: Write minimal implementation**

Render the marker only on the `sell` tab item.

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-tab-shell.test.mjs`

Expected: PASS.

### Task 2: Add one-shot seller scroll reset behavior

**Files:**
- Create: `App/utils/pending-scroll-reset.mjs`
- Modify: `App/app.js`
- Test: `tests/pending-scroll-reset.test.mjs`

**Step 1: Write the failing test**

Cover:
- requesting a `sell` reset makes the next render reset to `{ contentScrollTop: 0, pageScrollY: 0 }`;
- consuming the reset clears it so later renders can preserve scroll again.

**Step 2: Run test to verify it fails**

Run: `node --test tests/pending-scroll-reset.test.mjs`

Expected: FAIL because the utility does not exist yet.

**Step 3: Write minimal implementation**

Create a one-shot helper that records and consumes the pending reset target. In `app.js`, set the target when the marked `Vendre` tab is clicked, and on render skip preserved scroll restoration once in favor of resetting the app content scroller and page to top.

**Step 4: Run test to verify it passes**

Run: `node --test tests/pending-scroll-reset.test.mjs`

Expected: PASS.

### Task 3: Verify the integrated behavior

**Files:**
- Verify: `tests/app-tab-shell.test.mjs`
- Verify: `tests/pending-scroll-reset.test.mjs`
- Verify: broader app test suite

**Step 1: Run focused tests**

Run: `node --test tests/app-tab-shell.test.mjs tests/pending-scroll-reset.test.mjs`

Expected: PASS.

**Step 2: Run broader tests**

Run the relevant app test command from `package.json`.

Expected: PASS.
