# Zwibba Home Header Beta Badge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter un badge `Beta` à côté du brand mark Zwibba dans le topbar de la home vendeur, via un slot `badge` optionnel étendant `renderInAppBrand`, sans toucher au badge `Seller-first` ni à la buy-screen.

**Architecture:** Trois changements de code dans `App/` uniquement. (1) `App/components/in-app-brand.mjs` reçoit une troisième option `badge` (string) qui, quand non vide, rend `<span class="app-brand-mark__badge">{escapeHtml(badge)}</span>` à l'intérieur de `.app-brand-mark` après le bloc `.app-brand-mark__copy`. (2) `App/features/home/home-screen.mjs` passe `badge: 'Beta'` à l'unique appel `renderInAppBrand` du topbar. (3) `App/app.css` ajoute un bloc `.app-brand-mark__badge` (pastille discrète palette verte, font-size ~0.62rem, uppercase) et son variant compact. Tests via `node --test` : un nouveau fichier `tests/in-app-brand.test.mjs` couvre le slot du composant, et `tests/app-home.test.mjs` est étendu pour assert la présence du badge `Beta` sans casser le badge `Seller-first`.

**Tech Stack:** Vanilla JS ESM (`App/`), node `--test` runner (`tests/*.test.mjs`), CSS sans préprocesseur (`App/app.css`).

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the "Current priority docs" list in `docs/plans/README.md`, after the latest existing entry (`2026-05-02-zwibba-conservative-ai-category-disambiguation-implementation.md`), before the "Legacy docs" trailer:

```
- `2026-05-21-zwibba-home-header-beta-badge-design.md`
- `2026-05-21-zwibba-home-header-beta-badge-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "home-header-beta-badge" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index home-header-beta-badge plans"
```

---

### Task 2: Failing test for renderInAppBrand badge slot

**Files:**
- Create: `tests/in-app-brand.test.mjs`

**Step 1: Write the failing test**

Create `tests/in-app-brand.test.mjs` with node `--test` covering three behaviours of the future `badge` option:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { renderInAppBrand } from '../App/components/in-app-brand.mjs';

test('renderInAppBrand omits badge markup when no badge option is provided', () => {
  const html = renderInAppBrand({ subtitle: 'Vendez en un clic' });
  assert.doesNotMatch(html, /app-brand-mark__badge/);
});

test('renderInAppBrand renders the badge slot when badge is provided', () => {
  const html = renderInAppBrand({ subtitle: 'Vendez en un clic', badge: 'Beta' });
  assert.match(html, /class="app-brand-mark__badge"[^>]*>\s*Beta\s*</);
});

test('renderInAppBrand escapes badge content', () => {
  const html = renderInAppBrand({ badge: '<script>x</script>' });
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>x<\/script>/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/in-app-brand.test.mjs`
Expected: FAIL on the second and third tests because `renderInAppBrand` does not yet accept a `badge` option and never renders `.app-brand-mark__badge`. The first test may pass coincidentally.

**Step 3: Commit**

```bash
git add tests/in-app-brand.test.mjs
git commit -m "test: cover badge slot for renderInAppBrand"
```

---

### Task 3: Implement the badge slot in renderInAppBrand

**Files:**
- Modify: `App/components/in-app-brand.mjs`

**Step 1: Write the code**

Update `renderInAppBrand` so the destructured options include `badge = ''`. Import `escapeHtml` from `App/utils/rendering.mjs` (already used elsewhere in the codebase). After the closing `</span>` of `.app-brand-mark__copy`, conditionally render `<span class="app-brand-mark__badge">${escapeHtml(badge)}</span>` only when the trimmed `badge` string is non-empty. Keep the `compact` and `subtitle` options unchanged so the existing call sites in `home-screen.mjs` and `buy-screen.mjs` remain rétro-compatibles.

**Step 2: Run test to verify it passes**

Run: `node --test tests/in-app-brand.test.mjs`
Expected: PASS — all three tests green.

**Step 3: Commit**

```bash
git add App/components/in-app-brand.mjs
git commit -m "feat: add badge slot to renderInAppBrand"
```

---

### Task 4: Failing test for the Beta badge in the home screen

**Files:**
- Modify: `tests/app-home.test.mjs`

**Step 1: Write the failing test**

Append a new test to `tests/app-home.test.mjs` after the existing `home screen shows the Zwibba in-app brand mark` test:

```js
test('home screen shows a Beta badge next to the brand mark without removing Seller-first', () => {
  const html = renderHomeScreen({
    draft: null,
    featuredListings,
    recentListings,
    categories,
  });

  assert.match(html, /class="app-brand-mark__badge"[^>]*>\s*Beta\s*</);
  assert.match(html, /class="app-home__badge"[^>]*>Seller-first</);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-home.test.mjs`
Expected: FAIL on the new test because `home-screen.mjs` does not yet pass `badge: 'Beta'` to `renderInAppBrand`, so `.app-brand-mark__badge` is absent from the rendered HTML.

**Step 3: Commit**

```bash
git add tests/app-home.test.mjs
git commit -m "test: assert Beta badge in home screen topbar"
```

---

### Task 5: Wire the Beta badge in home-screen.mjs

**Files:**
- Modify: `App/features/home/home-screen.mjs`

**Step 1: Write the code**

In `App/features/home/home-screen.mjs`, update the single call site of `renderInAppBrand` inside `.app-home__topbar` so it reads `renderInAppBrand({ subtitle: 'Vendez en un clic', badge: 'Beta' })`. Do not modify the `<span class="app-home__badge">Seller-first</span>` line below it.

**Step 2: Run test to verify it passes**

Run: `node --test tests/app-home.test.mjs tests/in-app-brand.test.mjs`
Expected: PASS — both files green, the new home-screen test now finds `.app-brand-mark__badge` and the existing brand-mark test still finds `/assets/brand/favicon.svg` and `Zwibba`.

**Step 3: Commit**

```bash
git add App/features/home/home-screen.mjs
git commit -m "feat: show Beta badge in home topbar"
```

---

### Task 6: Add CSS for the badge

**Files:**
- Modify: `App/app.css`

**Step 1: Write the code**

In `App/app.css`, after the existing `.app-brand-mark__copy span` rule (around line 256) and before `.app-brand-mark--compact`, add a `.app-brand-mark__badge` rule and its compact variant. The block must :

- declare `display: inline-flex`, vertical alignment with the brand copy
- use the same palette as `.app-home__badge` (`background: rgba(107, 230, 107, 0.12)`, `color: var(--green)`, `border-radius: 999px`)
- be visually tighter: `padding: 2px 8px`, `font-size: 0.62rem`, `font-weight: 800`, `text-transform: uppercase`, `letter-spacing: 0.04em`
- sit beside the copy with `margin-left: 10px` and `align-self: center`

Then add a `.app-brand-mark--compact .app-brand-mark__badge` variant that nudges `padding: 1px 6px` and `font-size: 0.58rem`.

**Step 2: Verify the diff is present and tests still pass**

Run: `rg -n "app-brand-mark__badge" App/app.css`
Expected: at least two matches — the main `.app-brand-mark__badge` selector and the `.app-brand-mark--compact .app-brand-mark__badge` variant.

Then run: `node --test tests/app-home.test.mjs tests/in-app-brand.test.mjs`
Expected: PASS on every test (CSS changes do not break HTML assertions).

**Step 3: Commit**

```bash
git add App/app.css
git commit -m "feat: style app-brand-mark__badge pill"
```

---

### Task 7: Full test suite verification

**Files:**
- None (cross-cutting verification only)

**Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS on every test in `tests/*.test.mjs`. In particular `tests/app-home.test.mjs`, `tests/app-buyer-home.test.mjs`, `tests/internal-beta-assets.test.mjs` and `tests/in-app-brand.test.mjs` must all be green. Any failure here means one of the previous tasks introduced a regression and must be fixed before considering the plan done.

**Step 2: Confirm no extra files were modified**

Run: `git status --short`
Expected: empty output — every change from this plan has already been committed by the previous tasks. If anything is dirty, investigate before continuing.

**Step 3: Skip the commit step for this task because no file was modified.**
