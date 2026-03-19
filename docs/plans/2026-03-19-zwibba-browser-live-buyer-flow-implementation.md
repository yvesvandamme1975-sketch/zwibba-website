# Zwibba Browser Live Buyer Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect the buyer side of `/App` to the live Railway listings API, including live feed search, category filters, and in-app listing detail.

**Architecture:** Keep the current browser shell and seller flow intact, add a small live listings client plus one buyer detail screen, and hold buyer search/filter state in browser memory. Use the existing live Railway API as the only data source for buyer feed and detail.

**Tech Stack:** Static HTML/CSS/vanilla JS, Node test runner, Railway API, browser `fetch`, hash routing

---

### Task 1: Add a live listings browser client

**Files:**
- Create: `App/services/listings-service.mjs`
- Create: `tests/listings-live-api.test.mjs`

**Step 1: Write the failing test**

Add tests for:
- `listBrowseFeed()` calling `GET /listings`
- `getListingDetail(slug)` calling `GET /listings/:slug`
- error propagation with French messages when the API fails

**Step 2: Run test to verify it fails**

Run: `node --test tests/listings-live-api.test.mjs`
Expected: FAIL because `App/services/listings-service.mjs` does not exist.

**Step 3: Write minimal implementation**

Implement `createListingsService()` with:
- injected `fetch`
- `apiBaseUrl`
- `listBrowseFeed()`
- `getListingDetail(slug)`

**Step 4: Run test to verify it passes**

Run: `node --test tests/listings-live-api.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/services/listings-service.mjs tests/listings-live-api.test.mjs
git commit -m "feat: add browser listings client"
```

### Task 2: Make the home buyer feed live and filterable

**Files:**
- Modify: `App/features/home/home-screen.mjs`
- Modify: `App/features/home/recent-feed-section.mjs`
- Modify: `App/demo-content.mjs`
- Modify: `tests/app-home.test.mjs`
- Create: `tests/app-buyer-home.test.mjs`

**Step 1: Write the failing test**

Add tests for:
- search input rendering as a real field
- category chips rendering as interactive controls
- filtered live feed results
- empty state when no listing matches
- listing cards exposing slug-linked actions for in-app detail

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-home.test.mjs tests/app-buyer-home.test.mjs`
Expected: FAIL because the current home screen is static text-only for buyer feed interactions.

**Step 3: Write minimal implementation**

Update the home screen to accept:
- `searchQuery`
- `selectedCategoryId`
- `featuredListings`
- `recentListings`
- `feedStatus`

Render:
- a real search input
- clickable category chips
- live listing cards with `href="#listing/<slug>"`
- loading and empty states

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-home.test.mjs tests/app-buyer-home.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/features/home/home-screen.mjs App/features/home/recent-feed-section.mjs App/demo-content.mjs tests/app-home.test.mjs tests/app-buyer-home.test.mjs
git commit -m "feat: add live buyer feed states"
```

### Task 3: Add the in-app listing detail screen

**Files:**
- Create: `App/features/listings/listing-detail-screen.mjs`
- Create: `tests/listing-detail-screen.test.mjs`

**Step 1: Write the failing test**

Add tests for:
- title, price, location, seller block, safety tips, and contact actions rendering
- not-found/error state rendering
- back link targeting `#home`

**Step 2: Run test to verify it fails**

Run: `node --test tests/listing-detail-screen.test.mjs`
Expected: FAIL because the detail screen file does not exist.

**Step 3: Write minimal implementation**

Implement `renderListingDetailScreen()` for:
- loading
- loaded detail
- not found / failed detail

Use only the fields already returned by `GET /listings/:slug`.

**Step 4: Run test to verify it passes**

Run: `node --test tests/listing-detail-screen.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/features/listings/listing-detail-screen.mjs tests/listing-detail-screen.test.mjs
git commit -m "feat: add browser listing detail screen"
```

### Task 4: Wire live buyer routing into `App/app.js`

**Files:**
- Modify: `App/app.js`
- Modify: `tests/app-live-api.test.mjs`
- Modify: `tests/live-publish-flow.test.mjs`
- Create: `tests/app-buyer-routing.test.mjs`

**Step 1: Write the failing test**

Add tests for:
- boot-time live feed loading from the listings service
- buyer search and category filter state updates
- hash parsing for `#listing/<slug>`
- detail loading on navigation
- returning to `#home` with filters preserved

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-live-api.test.mjs tests/app-buyer-routing.test.mjs`
Expected: FAIL because `App/app.js` does not yet manage buyer live state or detail routes.

**Step 3: Write minimal implementation**

Wire:
- live listings service creation
- home feed state
- local search/category filtering
- `#listing/<slug>` route handling
- detail fetch lifecycle

Do not change seller publish logic except where route parsing must coexist cleanly.

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-live-api.test.mjs tests/app-buyer-routing.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/app.js tests/app-live-api.test.mjs tests/app-buyer-routing.test.mjs
git commit -m "feat: wire browser buyer routes to live api"
```

### Task 5: Public beta smoke and deploy verification

**Files:**
- Modify: `docs/deployment/2026-03-16-zwibba-railway-production.md`
- Modify: `tests/build.test.mjs`

**Step 1: Write the failing test**

Add coverage that expects:
- `/App` still bootstraps the live API URL
- listing cards in the built app point to in-app detail routes

**Step 2: Run test to verify it fails**

Run: `node --test tests/build.test.mjs`
Expected: FAIL until the built home feed output and detail link markup are updated.

**Step 3: Write minimal implementation**

Update the built browser app output and deployment doc, then run a real browser smoke against:
- `https://website-production-7a12.up.railway.app/App/#home`

Verify:
- listings load
- search works
- category filter works
- detail opens in-app
- contact actions render

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/*.test.mjs`
- `npm test`
- `npm run smoke:app`

Expected: PASS

**Step 5: Commit**

```bash
git add docs/deployment/2026-03-16-zwibba-railway-production.md tests/build.test.mjs
git commit -m "feat: publish live browser buyer beta"
```
