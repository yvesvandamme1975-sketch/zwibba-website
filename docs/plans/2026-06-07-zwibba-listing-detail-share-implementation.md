# Zwibba Listing Detail Share Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow any visitor (buyer or seller) to share a listing from the detail screen using the OS native share sheet, with a reliable URL that produces rich social cards, and track each share event via a lightweight API counter.

**Architecture:** A new `buildShareButton(detail)` in `listing-detail-screen.mjs` renders a share button for both owners and non-owners. The handler in `app.js` delegates to the existing `shareStoryImageNative()` when a story image is available, falls back to `navigator.share({ url })`, then to clipboard copy. The shared URL is always `${origin}/annonce/${detail.slug}/` (the real API slug), which `server.mjs` already serves with dynamic OG tags. A new Prisma column `shareCount` and a `POST /listings/:slug/share` endpoint track shares anonymously.

**Tech Stack:** Vanilla JS ESM (`App/features/listings/`, `App/app.js`), NestJS API (`apps/api/src/listings/`), Prisma 6, `node --test` runner.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the "Current priority docs" list in `docs/plans/README.md`, after the latest existing entry, before the "Legacy docs" trailer:

```
- `2026-06-07-zwibba-listing-detail-share-design.md`
- `2026-06-07-zwibba-listing-detail-share-implementation.md`
```
**Step 2: Verify the diff is present**

Run: `rg -n "listing-detail-share" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index listing-detail-share plans"
```

---

### Task 2: Write failing test for share button in listing detail screen (buyer view)

**Files:**
- Modify: `tests/listing-detail-screen.test.mjs`

**Step 1: Write the failing test**

Add a test at the end of `tests/listing-detail-screen.test.mjs` that asserts the share button is rendered for a non-owner viewer:

```js
test('listing detail screen renders a share button for non-owner viewers', () => {
  const html = renderListingDetailScreen({
    detail: {
      categoryId: 'electronics',
      categoryLabel: 'Électronique',
      contactActions: ['message'],
      id: 'listing_share_1',      locationLabel: 'Golf',
      priceAmount: 250000,
      priceCurrency: 'CDF',
      primaryImageUrl: null,
      safetyTips: [],
      seller: {
        name: 'Vendeur 0001',
        responseTime: 'Répond en moyenne en 9 min',
        role: 'Vendeur pro',
      },
      slug: 'radio-vintage-kinshasa',
      summary: 'Radio vintage en bon état.',
      title: 'Radio vintage',
    },
    state: 'ready',
  });

  assert.match(html, /data-action="share-listing"/);
  assert.match(html, /data-share-slug="radio-vintage-kinshasa"/);
  assert.match(html, /data-share-url="\/annonce\/radio-vintage-kinshasa\/"/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/listing-detail-screen.test.mjs`
Expected: FAIL because `listing-detail-screen.mjs` does not render any element with `data-action="share-listing"`.
**Step 3: Commit**

```bash
git add tests/listing-detail-screen.test.mjs
git commit -m "test: assert share button in listing detail buyer view"
```

---

### Task 3: Write failing test for share button in listing detail screen (owner view)

**Files:**
- Modify: `tests/listing-detail-screen.test.mjs`

**Step 1: Write the failing test**

Add a test asserting the share button appears inside the owner lifecycle card alongside the edit button:

```js
test('listing detail screen renders a share button inside the owner card when editDraft is present', () => {
  const html = renderListingDetailScreen({
    detail: {
      categoryId: 'electronics',
      categoryLabel: 'Électronique',
      canPause: true,
      contactActions: ['message'],
      editDraft: { slug: 'radio-vintage-kinshasa' },
      id: 'listing_owner_share_1',
      locationLabel: 'Golf',
      priceAmount: 250000,
      priceCurrency: 'CDF',
      primaryImageUrl: null,
      safetyTips: [],      seller: {
        name: 'Vendeur 0001',
        responseTime: 'Répond en moyenne en 9 min',
        role: 'Vendeur pro',
      },
      slug: 'radio-vintage-kinshasa',
      summary: 'Radio vintage en bon état.',
      title: 'Radio vintage',
      viewerRole: 'owner',
    },
    state: 'ready',
  });

  assert.match(html, /Modifier/);
  assert.match(html, /data-action="share-listing"/);
  assert.match(html, /Partager/);
  assert.match(html, /data-share-slug="radio-vintage-kinshasa"/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/listing-detail-screen.test.mjs`
Expected: FAIL because the owner card does not contain `data-action="share-listing"`.

**Step 3: Commit**

```bash
git add tests/listing-detail-screen.test.mjs
git commit -m "test: assert share button in listing detail owner card"
```

---

### Task 4: Implement share button in listing-detail-screen.mjs

**Files:**
- Modify: `App/features/listings/listing-detail-screen.mjs`

**Step 1: Implement the share button**

Add a `buildShareButton(detail, { compact })` function. When `compact` is false (owner view), render a full button with the label "Partager" and class `app-flow__button app-flow__button--share`. When `compact` is true (buyer view), render a smaller icon-only button with class `app-flow__button--icon`. Both variants carry `data-action="share-listing"`, `data-share-slug="${detail.slug}"`, `data-share-title="${detail.title}"`, and `data-share-url="/annonce/${detail.slug}/"`.

In `renderOwnerLifecycleCard()`, insert `buildShareButton(detail, { compact: false })` into the `actions` array right after the edit button (if `detail.slug` is truthy).

In the non-owner branch of `renderListingDetailScreen()` (the `else` of `detail.viewerRole === 'owner'`), append `buildShareButton(detail, { compact: true })` as a third element inside the `app-flow__actions` div, after the message and call buttons.

Add the `app-flow__actions--row` modifier class to the owner card's actions div to render the edit and share buttons side by side (two-column grid).

**Step 2: Run tests to verify they pass**

Run: `node --test tests/listing-detail-screen.test.mjs`
Expected: PASS — both new tests from Tasks 2 and 3 pass, all existing tests still pass.

**Step 3: Commit**

```bash
git add App/features/listings/listing-detail-screen.mjs
git commit -m "feat: add share button to listing detail screen for owners and buyers"
```

---

### Task 5: Add CSS for the share button and row layout

**Files:**
- Modify: `App/app.css`

**Step 1: Add the styles**

Add the following rules after the `.app-flow__actions--stacked` block (around line 1423):

`.app-flow__actions--row` — `display: grid; grid-template-columns: 1fr 1fr; gap: 8px;` to lay out edit + share side by side in the owner card.

`.app-flow__button--share` — inherits from `.app-flow__button` but uses the accent green gradient (same as primary button). No additional override needed if it already uses `.app-flow__button`.

`.app-flow__button--icon` — `display: inline-flex; align-items: center; justify-content: center; width: 48px; min-height: 48px; border-radius: 999px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); color: var(--text); font-size: 1.2rem;` — compact round icon button for the buyer view.

**Step 2: Verify visually**

Run: `npm run build && node --test tests/listing-detail-screen.test.mjs`
Expected: PASS — build succeeds, tests pass. Visual verification deferred to Yves.

**Step 3: Commit**

```bash
git add App/app.css
git commit -m "feat: add share button CSS for detail screen"
```

---

### Task 6: Write failing test for share handler in app.js

**Files:**
- Modify: `tests/post-flow.test.mjs`

**Step 1: Write the failing test**

Add a test that imports `buildStoryShareText` from `App/features/post/post-flow-controller.mjs` and asserts the share text format is correct when called with a listing URL and title:

```js
test('buildStoryShareText produces the share text with title and URL', () => {
  const text = buildStoryShareText({
    listingUrl: 'https://zwibba.example/annonce/radio-vintage-kinshasa/',
    title: 'Radio vintage',
  });

  assert.match(text, /Je vends sur Zwibba/);
  assert.match(text, /Radio vintage/);
  assert.match(text, /\/annonce\/radio-vintage-kinshasa\//);
});
```

**Step 2: Run test to verify it passes (this is a pre-existing function)**

Run: `node --test tests/post-flow.test.mjs`
Expected: PASS — `buildStoryShareText` already exists and works. This test serves as a regression anchor for the share text format.

**Step 3: Commit**

```bash
git add tests/post-flow.test.mjs
git commit -m "test: anchor share text format for listing detail share"
```

---

### Task 7: Wire up the share-listing action handler in app.js

**Files:**
- Modify: `App/app.js`

**Step 1: Implement the handler**

In the click delegation section of `App/app.js` (where `data-action` values are dispatched), add a handler for `share-listing`. The handler:

1. Extracts `slug`, `title`, and `shareUrl` from the button's data-attributes.
2. Builds the absolute URL: `const absoluteUrl = new URL(shareUrl, window.location.origin).toString()`.
3. Builds the share text via `buildStoryShareText({ listingUrl: absoluteUrl, title })` (already imported from `post-flow-controller.mjs`).
4. Checks if the current detail has a `storyImageUrl` and if `canShareStoryImage()` returns true. If so, calls `shareStoryImageNative({ storyImageUrl: buyerBrowseController.state.detail?.storyImageUrl, imageUrl: buyerBrowseController.state.detail?.primaryImageUrl, listingUrl: absoluteUrl, title })`.
5. Else, if `navigator.share` exists, calls `navigator.share({ title: 'Je vends sur Zwibba !', text: shareText, url: absoluteUrl })`.
6. Else, falls back to `navigator.clipboard.writeText(absoluteUrl)` and temporarily sets the button text to "Lien copié" for 2 seconds.
7. After a successful share (steps 4 or 5), fire-and-forget a `POST` to `${apiBaseUrl}/listings/${slug}/share` to increment the share counter. Catch and ignore errors silently.

The imports `buildStoryShareText`, `canShareStoryImage`, and `shareStoryImageNative` are already imported at the top of `app.js` from `post-flow-controller.mjs`.

**Step 2: Verify the build**

Run: `npm run build`
Expected: build succeeds without errors.

**Step 3: Commit**

```bash
git add App/app.js
git commit -m "feat: wire share-listing action handler with native share and clipboard fallback"
```

---

### Task 8: Add shareCount column to Prisma schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Step 1: Add the column**

In the `model Listing` block, add `shareCount Int @default(0)` after `slug` (alphabetical order within the model). This is a simple integer counter.

**Step 2: Generate the migration**

Run: `cd apps/api && npx prisma migrate dev --name add-listing-share-count --create-only`
Expected: a new migration file appears in `apps/api/prisma/migrations/` with an `ALTER TABLE "Listing" ADD COLUMN "shareCount" INTEGER NOT NULL DEFAULT 0` statement.

**Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat: add shareCount column to Listing model"
```

---

### Task 9: Add POST /listings/:slug/share endpoint

**Files:**
- Modify: `apps/api/src/listings/listings.controller.ts`
- Modify: `apps/api/src/listings/listings.service.ts`

**Step 1: Implement the endpoint**

In `listings.service.ts`, add an `incrementShareCount(slug: string)` method that does:

```ts
await this.prisma.listing.update({
  where: { slug },
  data: { shareCount: { increment: 1 } },
});
```

In `listings.controller.ts`, add a `@Post(':slug/share')` handler that calls `this.listingsService.incrementShareCount(params.slug)` and returns `{ ok: true }`. No authentication required. Wrap in try/catch — return 200 even if the slug doesn't exist (fire-and-forget semantics, never surface errors to the client).

**Step 2: Verify the endpoint compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no type errors.

**Step 3: Commit**

```bash
git add apps/api/src/listings/listings.controller.ts apps/api/src/listings/listings.service.ts
git commit -m "feat: add POST /listings/:slug/share endpoint for share counting"
```

---

### Task 10: Expose shareCount in GET /listings/:slug response

**Files:**
- Modify: `apps/api/src/listings/listings.service.ts` (or the DTO/select used by `getListingDetail`)

**Step 1: Include shareCount in the select**

Locate the Prisma `select` or `include` used by the `getListingDetail` method (the one backing `GET /listings/:slug`). Add `shareCount: true` to the select clause so the field is included in the API response.

**Step 2: Verify with a type check**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no type errors.

**Step 3: Commit**

```bash
git add apps/api/src/listings/listings.service.ts
git commit -m "feat: expose shareCount in listing detail API response"
```

---

### Task 11: Cross-cutting smoke verification

**Step 1: Run the full test suite**

Run: `node --test tests/listing-detail-screen.test.mjs && node --test tests/post-flow.test.mjs && npm run build`
Expected: all tests PASS, build succeeds.

**Step 2: Verify the share button markup in a built page**

Run: `rg "share-listing" dist/App/index.html || rg "share-listing" dist/App/app.js`
Expected: at least one match confirming the share button data-action is present in the built output.

**Step 3: Skip the commit step for this task because no file was modified.**