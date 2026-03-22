# Zwibba Browser Phone Shell Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh the public browser phone shell so desktop uses a capped device viewport with internal scrolling instead of a stretched phone frame.

**Architecture:** Keep the current `/App` route and component tree, and implement the change primarily in the browser app shell CSS. Add a small structural hook only if needed so the app surface can scroll independently from the device frame. Follow TDD with targeted rendering tests first, then minimal CSS updates.

**Tech Stack:** Static browser app, HTML/CSS/vanilla JS, Node test runner

---

### Task 1: Add the failing shell-structure tests

**Files:**
- Modify: `tests/app-buyer-home.test.mjs`

**Step 1: Write the failing test**

- Add assertions that the home screen renders the shell hook needed for an internally scrollable app surface.
- Add assertions that the home screen exposes the compact screen class or structural marker used for the tighter first viewport.

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-buyer-home.test.mjs`

Expected: FAIL because the current home render does not include the new shell hook.

**Step 3: Write minimal implementation**

- Update the browser app render so the shell contains a dedicated scrollable inner surface.
- Keep markup changes minimal and local to the app shell render path.

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-buyer-home.test.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add tests/app-buyer-home.test.mjs App/app.js App/features/home/home-screen.mjs
git commit -m "feat: add browser phone shell hooks"
```

### Task 2: Implement the capped desktop phone viewport

**Files:**
- Modify: `App/app.css`
- Test: `tests/app-buyer-home.test.mjs`

**Step 1: Write the failing test**

- Add a regression test that checks for the new shell class names needed by the capped-height layout.

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-buyer-home.test.mjs`

Expected: FAIL until the home shell emits the new classes.

**Step 3: Write minimal implementation**

- Add desktop-only max-height logic to the phone frame
- Move overflow scrolling into the inner app surface
- Add styled internal scrollbar rules
- Tighten home and flow top spacing so the first viewport reads better
- Preserve the current small-screen full-width behavior

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-buyer-home.test.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add App/app.css tests/app-buyer-home.test.mjs
git commit -m "feat: refresh browser phone shell layout"
```

### Task 3: Verify long-screen behavior and smoke test

**Files:**
- Modify: `docs/deployment/2026-03-16-zwibba-railway-production.md`

**Step 1: Write the failing check**

- Add the rollout note for the refreshed phone shell and expected desktop scrolling behavior.

**Step 2: Run verification**

Run: `node --test tests/app-buyer-home.test.mjs`

Expected: PASS

Run: `npm run smoke:app`

Expected: PASS

**Step 3: Write minimal documentation**

- Record that the public browser beta should show a capped phone frame with internal scroll on desktop.

**Step 4: Run verification again**

Run: `node --test tests/app-buyer-home.test.mjs && npm run smoke:app`

Expected: PASS

**Step 5: Commit**

```bash
git add docs/deployment/2026-03-16-zwibba-railway-production.md
git commit -m "docs: note browser phone shell refresh"
```
