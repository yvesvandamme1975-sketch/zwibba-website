# Zwibba Simplify Success Share Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the five share buttons on the success screen with a single "Partager mon annonce" button that delegates to `navigator.share()` via the existing `share-listing` handler.

**Architecture:** Remove the WhatsApp, Facebook, Story, Download, and Copy buttons from `success-screen.mjs`. Replace with a single `data-action="share-listing"` button that reuses the handler already wired in `app.js`. Keep "Copier le lien" as a secondary fallback. Update tests to assert the new markup.

**Tech Stack:** Vanilla JS ESM (`App/features/post/success-screen.mjs`), `node --test` runner.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the "Current priority docs" list in `docs/plans/README.md`, after the latest existing entry, before the "Legacy docs" trailer:

```
- `2026-06-09-zwibba-simplify-success-share-design.md`
- `2026-06-09-zwibba-simplify-success-share-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "simplify-success-share" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index simplify-success-share plans"
```
---

### Task 2: Write failing test asserting the unified share button replaces old buttons

**Files:**
- Modify: `tests/success-screen.test.mjs`

**Step 1: Write the failing test**

Add a test at the end of `tests/success-screen.test.mjs` that renders the success screen with an approved outcome and asserts:
- `data-action="share-listing"` is present
- The label "Partager mon annonce" is present
- `data-action="share-whatsapp-chat"` is NOT present
- `data-action="share-facebook"` is NOT present
- `data-action="share-native"` is NOT present
- `data-action="download-story-image"` is NOT present
- `data-action="copy-listing-link"` IS still present (kept as fallback)

```js
test('success screen renders a single unified share button instead of per-platform buttons', () => {
  const html = renderSuccessScreen({
    draft: {
      details: {
        area: 'Lubumbashi Centre',
        categoryId: 'electronics',
        priceAmount: 250000,
        priceCurrency: 'CDF',
        title: 'Radio vintage',
      },
      photos: [],
    },
    listingRoute: '#listing/radio-vintage',
    listingUrl: '/annonce/radio-vintage/',
    outcome: {
      id: 'listing_unified_share_1',
      listingSlug: 'radio-vintage',
      status: 'approved',
      storyImageUrl: 'https://cdn.example/story.png',
    },
  });
  assert.match(html, /data-action="share-listing"/);
  assert.match(html, /Partager mon annonce/);
  assert.match(html, /data-share-slug="radio-vintage"/);
  assert.doesNotMatch(html, /data-action="share-whatsapp-chat"/);
  assert.doesNotMatch(html, /data-action="share-facebook"/);
  assert.doesNotMatch(html, /data-action="share-native"/);
  assert.doesNotMatch(html, /data-action="download-story-image"/);
  assert.match(html, /data-action="copy-listing-link"/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/success-screen.test.mjs`
Expected: FAIL because the success screen still renders the old per-platform share buttons.

**Step 3: Commit**

```bash
git add tests/success-screen.test.mjs
git commit -m "test: assert unified share button replaces per-platform buttons on success screen"
```

---

### Task 3: Replace the five share buttons with a single unified button

**Files:**
- Modify: `App/features/post/success-screen.mjs`

**Step 1: Implement the change**

In `renderSuccessScreen()`, replace the entire block inside `content.showShareActions` (the five share buttons: WhatsApp anchor, Facebook button, Story button, Download button, Copy link button) with:

1. A single primary button:
```html
<button
  class="app-flow__button"
  type="button"
  data-action="share-listing"
  data-share-slug="${escapeAttribute(outcome?.listingSlug || '')}"
  data-share-title="${escapeAttribute(draft.details.title || 'Annonce Zwibba')}"
  data-share-url="${escapeAttribute(listingUrl)}"
>
  Partager mon annonce
</button>
```
2. Followed by the "Voir mon annonce" link (already exists, keep as-is).

3. Followed by "Copier le lien" as a secondary button (keep the existing `copy-listing-link` button, unchanged).

4. Followed by "Booster cette annonce" (keep as-is, if `outcome?.id` exists).

Remove: the WhatsApp anchor (`share-whatsapp-chat`), the Facebook button (`share-facebook`), the Story button (`share-native`), and the Download button (`download-story-image`).

Also remove the `buildWhatsAppShareUrl` function at the top of the file — it is no longer called.

**Step 2: Run tests to verify they pass**

Run: `node --test tests/success-screen.test.mjs`
Expected: PASS — the new test from Task 2 passes (unified button present, old buttons absent), and all existing tests still pass.

**Step 3: Commit**

```bash
git add App/features/post/success-screen.mjs
git commit -m "feat: replace five share buttons with single unified share on success screen"
```

---

### Task 4: Cross-cutting smoke verification

**Step 1: Run all affected test suites**

Run: `node --test tests/success-screen.test.mjs && node --test tests/listing-detail-screen.test.mjs && node --test tests/post-flow.test.mjs && npm run build`
Expected: all tests PASS, build succeeds.

**Step 2: Verify old share buttons are gone from built output**

Run: `rg "share-whatsapp-chat" dist/assets/app/features/post/success-screen.mjs`
Expected: no matches (the old WhatsApp button is gone).

Run: `rg "share-listing" dist/assets/app/features/post/success-screen.mjs`
Expected: at least one match (the new unified button is present).

**Step 3: Skip the commit step for this task because no file was modified.**