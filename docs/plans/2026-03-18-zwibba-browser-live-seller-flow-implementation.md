# Zwibba Browser Live Seller Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect `/App/` to the live Railway API for the seller flow without replacing the current browser-first UI.

**Architecture:** Add a small live API client layer inside `App/`, keep the existing seller route structure, and shift auth/upload/draft sync/publish from local mocks to live endpoints. Continue using browser storage for continuity, but make the API the source of truth for seller-side publish outcomes.

**Tech Stack:** Static HTML/CSS/vanilla JS, Node tests, Railway API, Cloudflare R2 signed uploads, browser `fetch`, `localStorage`

---

### Task 1: Record live API configuration behavior

**Files:**
- Create: `tests/app-live-api.test.mjs`
- Create: `App/services/api-config.mjs`

**Step 1: Write the failing test**

Add a test that expects `createApiConfig()` to:
- use `window.ZWIBBA_API_BASE_URL` when present
- otherwise fall back to `https://api-production-b1b58.up.railway.app`

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-live-api.test.mjs`
Expected: FAIL because `App/services/api-config.mjs` does not exist.

**Step 3: Write minimal implementation**

Implement `createApiConfig()` with the two-source resolution above and no extra behavior.

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-live-api.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/app-live-api.test.mjs App/services/api-config.mjs
git commit -m "test: add browser api config"
```

### Task 2: Replace local OTP with live auth requests

**Files:**
- Modify: `App/services/auth-service.mjs`
- Modify: `tests/publish-gate.test.mjs`
- Modify: `tests/app-live-api.test.mjs`

**Step 1: Write the failing test**

Add tests that expect `createAuthService()` to:
- call live request-otp and verify-otp endpoints through an injected `fetch`
- persist the returned session token
- preserve pending challenge state in storage

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-live-api.test.mjs tests/publish-gate.test.mjs`
Expected: FAIL because auth service is still fully local.

**Step 3: Write minimal implementation**

Add async live request/verify methods while preserving local storage persistence and French error messages.

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-live-api.test.mjs tests/publish-gate.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/services/auth-service.mjs tests/app-live-api.test.mjs tests/publish-gate.test.mjs
git commit -m "feat: add live browser auth service"
```

### Task 3: Add live media upload and draft sync services

**Files:**
- Create: `App/services/media-service.mjs`
- Create: `App/services/live-draft-service.mjs`
- Modify: `App/models/listing-draft.mjs`
- Modify: `tests/app-draft.test.mjs`
- Modify: `tests/app-live-api.test.mjs`

**Step 1: Write the failing test**

Add tests that expect:
- signed upload URLs to come from the live API
- a browser `PUT` upload to use the returned URL and headers
- draft sync to send seller-authenticated data to the API
- synced draft identifiers to persist locally

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-draft.test.mjs tests/app-live-api.test.mjs`
Expected: FAIL because the services do not exist yet.

**Step 3: Write minimal implementation**

Implement media and draft services with injected `fetch`, token-aware headers, and minimal draft model updates for remote IDs and uploaded photo metadata.

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-draft.test.mjs tests/app-live-api.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/services/media-service.mjs App/services/live-draft-service.mjs App/models/listing-draft.mjs tests/app-draft.test.mjs tests/app-live-api.test.mjs
git commit -m "feat: add live browser draft upload flow"
```

### Task 4: Wire the seller routes to the live services

**Files:**
- Modify: `App/app.js`
- Modify: `App/features/post/post-flow-controller.mjs`
- Modify: `tests/post-flow.test.mjs`
- Modify: `tests/publish-gate.test.mjs`

**Step 1: Write the failing test**

Add tests that expect:
- phone submit to await live OTP request
- OTP submit to persist the live session token
- publish submit to upload, sync, and publish through live services
- success screen to use the live listing slug when approved

**Step 2: Run test to verify it fails**

Run: `node --test tests/post-flow.test.mjs tests/publish-gate.test.mjs`
Expected: FAIL because `App/app.js` still short-circuits to local success.

**Step 3: Write minimal implementation**

Wire `App/app.js` to the new services, keep the existing screens, and add only the minimum state needed for async loading plus publish errors.

**Step 4: Run test to verify it passes**

Run: `node --test tests/post-flow.test.mjs tests/publish-gate.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/app.js App/features/post/post-flow-controller.mjs tests/post-flow.test.mjs tests/publish-gate.test.mjs
git commit -m "feat: connect browser seller flow to live api"
```

### Task 5: Build, verify, and redeploy the public prototype

**Files:**
- Modify: `scripts/build.mjs`
- Modify: `tests/build.test.mjs`
- Modify: `package.json`

**Step 1: Write the failing test**

Add test coverage that expects the generated `/App/` page to expose the live API base URL hook and keep the seller CTA route intact.

**Step 2: Run test to verify it fails**

Run: `node --test tests/build.test.mjs`
Expected: FAIL because the page output has not been updated.

**Step 3: Write minimal implementation**

Expose the API base URL hook in the built page, keep the current public `/App/` route, then rebuild and redeploy the website service.

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/build.test.mjs tests/app-live-api.test.mjs tests/app-draft.test.mjs tests/post-flow.test.mjs tests/publish-gate.test.mjs`
- `npm test`
- `npm run smoke:app`

Expected: PASS

**Step 5: Commit**

```bash
git add scripts/build.mjs tests/build.test.mjs package.json
git commit -m "feat: publish live api browser seller beta"
```
