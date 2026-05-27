# Zwibba Mobile Photo Gallery Access Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Retirer l'attribut `capture="environment"` des trois `<input type="file">` du flux seller PWA pour rendre l'accès à la galerie mobile possible, et mettre à jour le hint UX cohérent avec le nouveau comportement.

**Architecture:** Trois changements ponctuels dans `App/features/post/capture-screen.mjs`, `App/features/post/photo-guidance-screen.mjs`, `App/features/post/capture-result-screen.mjs`. Un hint à réécrire ligne 125 de `capture-screen.mjs`. Un nouveau test `tests/capture-input-attributes.test.mjs` verrouille le contrat « aucun input n'utilise capture= ».

**Tech Stack:** Vanilla JS ESM (`App/`), node `--test` runner (`tests/*.test.mjs`).

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the "Current priority docs" list in `docs/plans/README.md`, after the latest entry (`2026-05-27-zwibba-fashion-jewelry-backfill-implementation.md` if present, else `2026-05-27-zwibba-jewelry-fashion-subtypes-implementation.md`), before the "Legacy docs" trailer:

```
- `2026-05-27-zwibba-mobile-photo-gallery-access-design.md`
- `2026-05-27-zwibba-mobile-photo-gallery-access-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "mobile-photo-gallery-access" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index mobile-photo-gallery-access plans"
```

---

### Task 2: Failing test that the seller capture inputs never declare a capture attribute

**Files:**
- Create: `tests/capture-input-attributes.test.mjs`

**Step 1: Write the failing test**

Create `tests/capture-input-attributes.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { renderCaptureScreen } from '../App/features/post/capture-screen.mjs';
import { renderPhotoGuidanceScreen } from '../App/features/post/photo-guidance-screen.mjs';
import { renderCaptureResultScreen } from '../App/features/post/capture-result-screen.mjs';

function buildEmptyDraft() {
  return {
    id: 'd1',
    ai: { status: 'ready', message: '' },
    details: { area: '', categoryId: '', condition: '', description: '', title: '' },
    photos: [],
  };
}

test('renderCaptureScreen does not declare a capture attribute on file inputs', () => {
  const html = renderCaptureScreen({ draft: buildEmptyDraft() });
  assert.doesNotMatch(html, /capture=/);
  assert.match(html, /type="file"[^>]*accept="image\/\*"/);
});

test('renderPhotoGuidanceScreen does not declare a capture attribute on file inputs', () => {
  const html = renderPhotoGuidanceScreen({
    draft: buildEmptyDraft(),
    activePromptId: '',
    missingPromptIds: [],
  });
  assert.doesNotMatch(html, /capture=/);
});

test('renderCaptureResultScreen does not declare a capture attribute on file inputs', () => {
  const html = renderCaptureResultScreen({
    draft: { ...buildEmptyDraft(), photos: [{ photoId: 'p1', uploadStatus: 'ok' }] },
  });
  assert.doesNotMatch(html, /capture=/);
});
```

Note : adapter `buildEmptyDraft`, `activePromptId`, `missingPromptIds` aux signatures réelles si elles diffèrent — lire le haut de chacun des trois fichiers `renderXxxScreen` avant d'écrire le test pour matcher les noms exacts des paramètres. Le but du test est l'absence de `capture=`, pas le rendu complet.

**Step 2: Run test to verify it fails**

Run: `node --test tests/capture-input-attributes.test.mjs`
Expected: FAIL — les trois assertions trouvent `capture="environment"` dans le HTML rendu.

**Step 3: Commit**

```bash
git add tests/capture-input-attributes.test.mjs
git commit -m "test: lock that seller capture inputs do not force the camera"
```

---

### Task 3: Remove capture attribute from the three seller file inputs

**Files:**
- Modify: `App/features/post/capture-screen.mjs`
- Modify: `App/features/post/photo-guidance-screen.mjs`
- Modify: `App/features/post/capture-result-screen.mjs`

**Step 1: Write the code**

Dans chacun des trois fichiers, supprimer la ligne `capture="environment"` à l'intérieur du `<input type="file" ...>`. Conserver tout le reste (classes, `accept`, `data-input`). Concrètement :

- `App/features/post/capture-screen.mjs` ligne 132 — supprimer la ligne `capture="environment"`.
- `App/features/post/photo-guidance-screen.mjs` ligne 160 — idem.
- `App/features/post/capture-result-screen.mjs` ligne 127 — idem.

Aucun changement JavaScript : le contrôleur `App/features/post/post-flow-controller.mjs` ne lit jamais cet attribut.

**Step 2: Run test to verify it passes**

Run: `node --test tests/capture-input-attributes.test.mjs tests/capture-flow.test.mjs tests/post-flow.test.mjs`
Expected: PASS sur le nouveau test, et PASS sur les tests legacy `capture-flow` et `post-flow` qui n'asseyaient pas la présence de `capture=`. Puis lancer `npm test` pour confirmer la suite entière green.

**Step 3: Commit**

```bash
git add App/features/post/capture-screen.mjs App/features/post/photo-guidance-screen.mjs App/features/post/capture-result-screen.mjs
git commit -m "fix: drop forced camera capture so mobile sellers can pick gallery photos"
```

---

### Task 4: Update the seller hint to reflect both gallery and camera access

**Files:**
- Modify: `App/features/post/capture-screen.mjs`

**Step 1: Write the code**

À la ligne 125 de `App/features/post/capture-screen.mjs`, remplacer le hint :

```
Utilisez une vraie photo depuis votre appareil. Sur mobile, l’appareil photo peut s’ouvrir directement.
```

par :

```
Utilisez une vraie photo depuis votre appareil. Sur mobile, choisissez dans votre galerie ou prenez une photo.
```

Garder l'encodage typographique exact (apostrophes typographiques `’` si elles étaient présentes). Ne rien changer d'autre dans le fichier.

**Step 2: Verify the diff is present**

Run: `rg -n "choisissez dans votre galerie" App/features/post/capture-screen.mjs`
Expected: une seule ligne match. Puis `node --test tests/capture-input-attributes.test.mjs` reste vert.

**Step 3: Commit**

```bash
git add App/features/post/capture-screen.mjs
git commit -m "copy: clarify that mobile sellers can pick from gallery"
```
