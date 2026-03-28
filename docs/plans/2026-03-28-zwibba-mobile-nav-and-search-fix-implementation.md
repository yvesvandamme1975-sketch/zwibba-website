# Zwibba Mobile Nav and Search Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the mobile bottom nav fixed with reserved content space and make buyer search support continuous typing through rerenders.

**Architecture:** Use a mobile-only CSS shell override for the fixed bottom nav, and add a small browser render-state helper to preserve buyer-search focus and caret across rerenders. Keep desktop and route behavior unchanged.

**Tech Stack:** Vanilla JS modules, CSS, Node test runner

---

### Task 1: Add failing tests for the mobile nav shell

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/app-shell-ui.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/app.css`

**Step 1: Write the failing test**

Add assertions that the mobile breakpoint:

- fixes `.app-tab-shell__nav` to the viewport bottom
- adds reserved bottom space to `.app-tab-shell__content`

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-shell-ui.test.mjs`

**Step 3: Write minimal implementation**

Update the mobile CSS rules in `App/app.css`.

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-shell-ui.test.mjs`

**Step 5: Commit**

```bash
git add tests/app-shell-ui.test.mjs App/app.css
git commit -m "fix: pin mobile app nav to viewport bottom"
```

### Task 2: Add failing tests for buyer search rerender stability

**Files:**
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/App/utils/buyer-search-render-state.mjs`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/tests/buyer-search-render-state.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/app.js`

**Step 1: Write the failing test**

Add tests that:

- capture buyer-search focus state only for the `buyerSearch` input
- restore focus and selection on the rerendered input
- ignore unrelated elements

**Step 2: Run test to verify it fails**

Run: `node --test tests/buyer-search-render-state.test.mjs`

**Step 3: Write minimal implementation**

Implement the helper module and call it from the app render cycle.

**Step 4: Run test to verify it passes**

Run: `node --test tests/buyer-search-render-state.test.mjs`

**Step 5: Commit**

```bash
git add App/utils/buyer-search-render-state.mjs tests/buyer-search-render-state.test.mjs App/app.js
git commit -m "fix: preserve buyer search focus across rerenders"
```

### Task 3: Verify integrated browser behavior

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/app.css`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/app.js`

**Step 1: Run targeted tests**

Run:

```bash
node --test tests/app-shell-ui.test.mjs tests/buyer-search-render-state.test.mjs tests/app-buyer-home.test.mjs
```

**Step 2: Run smoke build**

Run:

```bash
npm run smoke:app
```

**Step 3: Deploy website**

Run:

```bash
railway up -s website -d -m "fix mobile nav and buyer search"
```

**Step 4: Verify live**

Check:

- mobile viewport keeps bottom nav pinned
- buyer search accepts multi-character typing

**Step 5: Commit any final adjustments**

```bash
git add App/app.css App/app.js tests/app-shell-ui.test.mjs tests/buyer-search-render-state.test.mjs docs/plans/2026-03-28-zwibba-mobile-nav-and-search-fix-design.md docs/plans/2026-03-28-zwibba-mobile-nav-and-search-fix-implementation.md
git commit -m "fix: stabilize mobile nav and buyer search"
```
