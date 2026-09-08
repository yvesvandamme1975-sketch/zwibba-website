# Zwibba Impeccable UI Reliability Implementation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audit and repair reproduced UI/UX defects without replacing Zwibba's established design.

**Architecture:** Existing vanilla renderers and app controller; browser fixtures isolate external writes.

**Tech Stack:** JavaScript ES modules, Node tests, Playwright Chromium/WebKit, Impeccable 4.2.2.

### Task 1: Index the audit plan

**Files:**
- Create: `docs/plans/2026-09-08-zwibba-impeccable-ui-design.md`
- Create: `docs/plans/2026-09-08-zwibba-impeccable-ui-implementation.md`
- Modify: `docs/plans/README.md`

**Step 1:** Add both documents and index links.

**Step 2:** Run: `rg -n '2026-09-08-zwibba-impeccable-ui-' docs/plans/README.md`
Expected: both filenames appear.

**Step 3:** Commit: `git commit -m "docs: plan impeccable ui reliability audit"`

### Task 2: Protect authentication requests and preserve input

**Files:**
- Modify: `App/app.js`
- Modify: `App/features/auth/phone-input-screen.mjs`
- Modify: `App/features/auth/otp-screen.mjs`
- Create: `tests/auth-pending-ui.test.mjs`
- Create: `scripts/e2e/ui-auth-resilience.mjs`

**Step 1:** Add failing renderer and browser tests for duplicate submits, pending feedback and preservation of the phone number on API failure. Implement minimal pending guards and accessible feedback. Keep CGU acceptance explicit.

**Step 2:** Run: `node --test tests/auth-pending-ui.test.mjs` then `npm run build` and, with local server on port 4340, `node scripts/e2e/ui-auth-resilience.mjs`.
Expected: tests fail before the fix and pass afterward in Chromium and WebKit.

**Step 3:** Commit: `git commit -m "fix: preserve auth input and prevent duplicate requests"`

Further verified audit findings require explicit additional tasks here before code edits. Final release requires `npm test`, `npm run build`, `npm run smoke:production-contracts`, review and clean Git status. Public smoke marker: bundled `/assets/app/app.js` contains `Envoi du code…`; `/` and `/App/` return HTTP 200. Observe Git-triggered Railway deployments before considering manual deployment.

### Task 3: Repair public landing navigation and responsive layout

**Files:**
- Modify: `scripts/build.mjs`
- Modify: `server.mjs`
- Modify: `src/site/app.js`
- Modify: `src/site/styles.css`
- Modify: `tests/live-listings-server.test.mjs`
- Modify: `tests/live-listings-build.test.mjs`
- Create: `scripts/e2e/ui-public-resilience.mjs`

**Step 1:** Add failing coverage for live landing cards, safe fallback, a working final PWA CTA, named navigation, mobile overflow and Escape menu dismissal. Then extend existing server injection with a landing slot (maximum four cards), retain localized empty/retry fallback, stack the CTA on small screens and restore menu-toggle focus on Escape. This task was added after independent Impeccable A/B reproduced those defects.

**Step 2:** Run: `node --test --test-concurrency=1 tests/live-listings-build.test.mjs tests/live-listings-server.test.mjs`, then `npm run build` and `node scripts/e2e/ui-public-resilience.mjs` with the local server on port 4340.
Expected: new assertions fail before changes and all pass afterward. Browser checks cover three locales at 320, 390, 768 and 1440 pixels in Chromium and WebKit.

**Step 3:** Commit: `git commit -m "fix: repair live landing links and mobile navigation"`

### Task 4: Record audit evidence and release checks

**Files:**
- Create: `docs/operations/2026-09-08-impeccable-ui-audit.md`

**Step 1:** Record source provenance, independently verified findings and false positives, coverage, residual limitations and follow-up decisions. No claim of physical iPhone or universal bug-free certification.

**Step 2:** Run: `npm test`, `npm run build`, `npm run smoke:production-contracts`, auth/public browser suites and existing sharing/legal browser fixtures using their configured local port.
Expected: all required checks pass. Save exact results and request code review before merge.

**Step 3:** Commit: `git commit -m "docs: record impeccable ui audit and verification"`
