# Zwibba Seeded Real Listing Images Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace seeded placeholder listing visuals with bundled real Pexels images across `/App` and the static marketing listing pages.

**Architecture:** Add a shared seeded-image manifest and local listing asset bundle, then route both `/App` and the static build through the same image resolver. Preserve the existing priority for real uploaded `primaryImageUrl` values so user-created listings continue to show live photos first.

**Tech Stack:** Node static build, vanilla JS browser app, Railway website deployment, local bundled image assets, Node test runner

---

### Task 1: Add the seeded image manifest and credits

**Files:**
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/src/site/listing-images.mjs`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/docs/assets/2026-03-26-zwibba-seeded-image-credits.md`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/seeded-listing-images.test.mjs`

**Step 1: Write the failing test**

```js
test('seeded listing image manifest covers the static listing catalog', () => {
  assert.equal(resolveSeededListingImage('samsung-galaxy-a54-neuf-lubumbashi').src, '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.jpg');
  assert.equal(resolveSeededListingImage('missing-slug'), null);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/seeded-listing-images.test.mjs`
Expected: FAIL because the manifest module does not exist yet.

**Step 3: Write minimal implementation**

- Add a manifest export keyed by seeded listing slug.
- Include `src`, `alt`, and `credit` metadata.
- Add a small credits doc listing the Pexels source mapping for each bundled image.

**Step 4: Run test to verify it passes**

Run: `node --test tests/seeded-listing-images.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add src/site/listing-images.mjs docs/assets/2026-03-26-zwibba-seeded-image-credits.md tests/seeded-listing-images.test.mjs
git commit -m "feat: add seeded listing image manifest"
```

### Task 2: Bundle the real listing images into the static build

**Files:**
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/public/assets/listings/`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/scripts/build.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/build.test.mjs`

**Step 1: Write the failing test**

```js
test('build emits bundled seeded listing images into dist assets', () => {
  assert.ok(existsSync(resolveDistPath('assets/listings/samsung-galaxy-a54-neuf-lubumbashi.jpg')));
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/build.test.mjs`
Expected: FAIL because the raster image is not copied into `dist`.

**Step 3: Write minimal implementation**

- Add the bundled local Pexels images under `public/assets/listings/`.
- Update `scripts/build.mjs` so these files are copied into `dist/assets/listings/`.
- Keep the existing SVG generation only where still needed as fallback.

**Step 4: Run test to verify it passes**

Run: `node --test tests/build.test.mjs`
Expected: PASS for the new image asset assertion.

**Step 5: Commit**

```bash
git add public/assets/listings scripts/build.mjs tests/build.test.mjs
git commit -m "feat: bundle seeded listing images into build output"
```

### Task 3: Switch the static browse and detail pages to the bundled images

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/src/site/content.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/scripts/build.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/build.test.mjs`

**Step 1: Write the failing test**

```js
test('listing cards and listing detail pages use bundled seeded images instead of svg placeholders', () => {
  assert.match(renderedBrowseHtml, /\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.jpg/);
  assert.match(renderedDetailHtml, /\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.jpg/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/build.test.mjs`
Expected: FAIL because the build still references `.svg`.

**Step 3: Write minimal implementation**

- Add a shared image resolver in the static build.
- Update browse cards, detail pages, OG image references, and similar-listing cards to use the bundled seeded image path.
- Keep alt text sourced from the listing manifest.

**Step 4: Run test to verify it passes**

Run: `node --test tests/build.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add src/site/content.mjs scripts/build.mjs tests/build.test.mjs
git commit -m "feat: use bundled images on static listing pages"
```

### Task 4: Teach `/App` seeded listing fallbacks to use the same bundled images

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/utils/image-fallbacks.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/demo-preview-assets.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/app-buyer-home.test.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/listing-detail-screen.test.mjs`

**Step 1: Write the failing test**

```js
test('seeded buyer cards and detail screens use the bundled listing image fallback before category art', () => {
  assert.match(html, /\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.jpg/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-buyer-home.test.mjs tests/listing-detail-screen.test.mjs`
Expected: FAIL because seeded fallbacks still resolve to SVG/category previews.

**Step 3: Write minimal implementation**

- Reuse the shared seeded image mapping from the app-side fallback helpers.
- Keep existing dead-CDN sanitization behavior.
- Preserve live `primaryImageUrl` as first priority.

**Step 4: Run test to verify it passes**

Run: `node --test tests/app-buyer-home.test.mjs tests/listing-detail-screen.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/utils/image-fallbacks.mjs App/demo-preview-assets.mjs tests/app-buyer-home.test.mjs tests/listing-detail-screen.test.mjs
git commit -m "feat: use bundled seeded images in browser app fallbacks"
```

### Task 5: Run smoke checks and verify the live Railway site

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/build.test.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/build.test.mjs`

**Step 1: Write the failing test**

```js
test('public build contains seeded raster listing assets referenced by both browse and detail pages', () => {
  assert.ok(buildOutputReferencesRasterListingAssets);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/build.test.mjs`
Expected: FAIL until all static references are updated.

**Step 3: Write minimal implementation**

- Finalize the build assertions.
- Run the existing smoke path and deploy the website service.
- Verify on Railway that:
  - `/annonces/`
  - `/annonce/samsung-galaxy-a54-neuf-lubumbashi/`
  - `/App/#buy`
  all render the bundled seeded images without broken requests.

**Step 4: Run test to verify it passes**

Run:

```bash
node --test tests/build.test.mjs
npm run smoke:app
railway up --service website
```

Expected: PASS locally and updated images visible on the live Railway URL.

**Step 5: Commit**

```bash
git add tests/build.test.mjs
git commit -m "test: verify bundled seeded listing images end to end"
```
