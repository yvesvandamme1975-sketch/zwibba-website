# Zwibba Browser Shell Scroll Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix `/App` scrolling so mobile uses normal page scroll and desktop keeps the phone frame with internal app scrolling.

**Architecture:** Keep the current single `/App` shell, but split scrolling behavior by breakpoint. Desktop keeps the capped phone frame and gives the tab content the only scroll responsibility. Mobile releases the phone viewport constraints entirely and lets the document scroll like a normal app page.

**Tech Stack:** Static HTML/CSS/vanilla JS, Node test runner, Railway website deployment, live browser verification with Playwright

---

### Task 1: Add failing shell-scroll tests

**Files:**
- Modify: `tests/app-shell-ui.test.mjs`

**Step 1: Write the failing test**

Add tests that expect:
- desktop shell CSS constrains the viewport and gives the tab shell a real `height: 100%` / `min-height: 0` path for inner scrolling
- mobile shell CSS releases the inner viewport and tab content overflow so the page can scroll normally

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-shell-ui.test.mjs`
Expected: FAIL because the current shell still traps mobile in an inner viewport and does not fully constrain desktop inner scrolling.

**Step 3: Write minimal implementation scaffolding**

Do not touch production code yet beyond the smallest CSS selectors needed for the tests to bind to the intended rules.

**Step 4: Run test to verify it still fails correctly**

Run: `node --test tests/app-shell-ui.test.mjs`
Expected: FAIL because the real shell behavior is not fixed yet.

**Step 5: Commit**

```bash
git add tests/app-shell-ui.test.mjs
git commit -m "test: cover browser shell scroll behavior"
```

### Task 2: Implement the desktop inner-scroll fix

**Files:**
- Modify: `App/app.css`
- Test: `tests/app-shell-ui.test.mjs`

**Step 1: Write the failing test**

Tighten the test so it expects the desktop shell path to:
- constrain `.app-shell__viewport`
- make `.app-tab-shell` fill the viewport height
- keep `.app-tab-shell__content` as the inner scroll container

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-shell-ui.test.mjs`
Expected: FAIL because the current desktop shell lets the content expand instead of scrolling inside the phone.

**Step 3: Write minimal implementation**

Update desktop/default shell CSS so:
- the viewport participates in height layout correctly
- the tab shell fills the viewport
- the content scroll container has real constrained height

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-shell-ui.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/app.css tests/app-shell-ui.test.mjs
git commit -m "fix: restore desktop phone scroll"
```

### Task 3: Implement the mobile page-scroll fix

**Files:**
- Modify: `App/app.css`
- Test: `tests/app-shell-ui.test.mjs`

**Step 1: Write the failing test**

Add or tighten tests that expect the mobile breakpoint to:
- remove hidden overflow from the shell and viewport
- stop using inner overflow on the tab content
- allow the page to own scrolling

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-shell-ui.test.mjs`
Expected: FAIL because the mobile breakpoint still keeps inner-scroll behavior.

**Step 3: Write minimal implementation**

Update the `max-width: 640px` shell rules so:
- the shell height becomes natural
- shell and viewport overflow become visible
- tab content overflow becomes visible
- the app behaves like a normal page on mobile

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-shell-ui.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/app.css tests/app-shell-ui.test.mjs
git commit -m "fix: restore mobile app page scroll"
```

### Task 4: Verify locally and on the live app

**Files:**
- Modify: `docs/deployment/2026-03-16-zwibba-railway-production.md`

**Step 1: Write the failing test**

Add or tighten a shell verification note in docs/tests that expects:
- mobile `/App` to scroll at document level
- desktop `/App` to scroll inside the phone frame

**Step 2: Run test to verify it fails**

Run:
- `node --test tests/app-shell-ui.test.mjs`
- `npm run smoke:app`

Expected: FAIL until the shell fix is fully in place.

**Step 3: Write minimal implementation**

Run local and live checks with Playwright:
- desktop `/App/#sell` long screen scrolls inside the phone
- mobile `/App/#sell` scrolls at page/document level

Record the expected behavior in the deployment/runbook doc if needed.

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/app-shell-ui.test.mjs`
- `npm run smoke:app`

Expected: PASS

**Step 5: Commit**

```bash
git add docs/deployment/2026-03-16-zwibba-railway-production.md
git commit -m "docs: record browser shell scroll checks"
```

