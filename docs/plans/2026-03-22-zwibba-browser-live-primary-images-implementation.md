# Zwibba Browser Live Primary Images Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real primary listing images to the live browser beta across buyer home, buyer detail, seller review, and seller success.

**Architecture:** Derive `primaryImageUrl` from the first uploaded draft photo already stored in Postgres, expose it through the live listings API, and render it in the browser app with graceful fallbacks. Keep the current single-image scope only; do not add gallery behavior.

**Tech Stack:** NestJS, Prisma, Postgres, static HTML/CSS/vanilla JS, Node test runner, Railway browser deployment

---

### Task 1: Expose `primaryImageUrl` from the live listings API

**Files:**
- Modify: `apps/api/src/listings/listings.service.ts`
- Modify: `apps/api/test/listings/listings.e2e-spec.ts`

**Step 1: Write the failing test**

Add API tests that expect:
- `GET /listings` returns `primaryImageUrl` when an approved listing has uploaded draft photos
- `GET /listings/:slug` returns `primaryImageUrl`
- listings without photos still return `null` or an empty image field without error

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- listings`
Expected: FAIL because the listings service does not expose image URLs yet.

**Step 3: Write minimal implementation**

Update the listings service to:
- load the linked draft photos with approved listings
- derive the first uploaded photo URL as `primaryImageUrl`
- include `primaryImageUrl` in summary and detail payloads

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- listings`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/listings/listings.service.ts apps/api/test/listings/listings.e2e-spec.ts
git commit -m "feat: expose primary listing images"
```

### Task 2: Render buyer feed images in `/App`

**Files:**
- Modify: `App/features/home/recent-feed-section.mjs`
- Modify: `App/app.css`
- Modify: `tests/app-buyer-home.test.mjs`

**Step 1: Write the failing test**

Add browser rendering tests that expect:
- buyer listing cards render an `<img>` when `primaryImageUrl` exists
- cards keep the current placeholder block when no image exists

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-buyer-home.test.mjs`
Expected: FAIL because the current buyer cards always render the placeholder media block.

**Step 3: Write minimal implementation**

Update the buyer card renderer and styles to:
- render a real image element when `primaryImageUrl` is present
- preserve the existing fallback media tile when it is absent
- keep the current card layout and brand treatment

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-buyer-home.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/features/home/recent-feed-section.mjs App/app.css tests/app-buyer-home.test.mjs
git commit -m "feat: add buyer listing card images"
```

### Task 3: Render buyer detail hero images in `/App`

**Files:**
- Modify: `App/features/listings/listing-detail-screen.mjs`
- Modify: `App/app.css`
- Modify: `tests/listing-detail-screen.test.mjs`

**Step 1: Write the failing test**

Add tests that expect:
- the listing detail screen renders a hero image when `primaryImageUrl` exists
- the detail screen falls back cleanly when it does not

**Step 2: Run test to verify it fails**

Run: `node --test tests/listing-detail-screen.test.mjs`
Expected: FAIL because the current detail screen has no media block.

**Step 3: Write minimal implementation**

Add a hero media block to the in-app buyer detail screen and style it for:
- real image render when `primaryImageUrl` exists
- placeholder block when it does not

**Step 4: Run test to verify it passes**

Run: `node --test tests/listing-detail-screen.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/features/listings/listing-detail-screen.mjs App/app.css tests/listing-detail-screen.test.mjs
git commit -m "feat: add buyer detail hero image"
```

### Task 4: Render seller draft images in review and success

**Files:**
- Modify: `App/features/post/review-form-screen.mjs`
- Modify: `App/features/post/success-screen.mjs`
- Modify: `App/app.css`
- Modify: `tests/post-flow.test.mjs`
- Modify: `tests/publish-gate.test.mjs`

**Step 1: Write the failing test**

Add tests that expect:
- seller review renders the first draft photo
- seller success renders the first draft photo
- seller success still works when the draft only has a local preview URL

**Step 2: Run test to verify it fails**

Run: `node --test tests/post-flow.test.mjs tests/publish-gate.test.mjs`
Expected: FAIL because those screens do not render a main draft image yet.

**Step 3: Write minimal implementation**

Update review and success to:
- resolve the first available draft image
- prefer uploaded `publicUrl`, then `url`, then `previewUrl`
- render a single preview image above the existing text summary

**Step 4: Run test to verify it passes**

Run: `node --test tests/post-flow.test.mjs tests/publish-gate.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/features/post/review-form-screen.mjs App/features/post/success-screen.mjs App/app.css tests/post-flow.test.mjs tests/publish-gate.test.mjs
git commit -m "feat: add seller draft image previews"
```

### Task 5: Verify, deploy, and smoke the public beta

**Files:**
- Modify: `docs/deployment/2026-03-16-zwibba-railway-production.md`

**Step 1: Write the failing test**

Add or tighten coverage that expects:
- buyer card rendering still links to `#listing/<slug>`
- seller success `Voir mon annonce` still routes in-app

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-buyer-home.test.mjs tests/publish-gate.test.mjs`
Expected: FAIL until the updated image-aware markup is in place.

**Step 3: Write minimal implementation**

Run the full verification and deploy the browser app update to Railway, then do a real browser smoke against:
- `https://website-production-7a12.up.railway.app/App/#home`

Verify:
- buyer cards show real pictures
- buyer detail shows the hero image
- seller review shows the first draft image
- seller success shows the first draft image

**Step 4: Run test to verify it passes**

Run:
- `pnpm -C apps/api test -- listings`
- `node --test tests/app-buyer-home.test.mjs tests/listing-detail-screen.test.mjs tests/post-flow.test.mjs tests/publish-gate.test.mjs`
- `npm run smoke:app`

Expected: PASS

**Step 5: Commit**

```bash
git add docs/deployment/2026-03-16-zwibba-railway-production.md
git commit -m "feat: publish browser listing images"
```
