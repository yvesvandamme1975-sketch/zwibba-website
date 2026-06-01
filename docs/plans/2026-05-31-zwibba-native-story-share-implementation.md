# Zwibba Native Story Share Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rendre le partage en story disponible pour toute annonce. (A) Générer la story image brandée aussi à la publication auto-approuvée (`moderation.publish()`), pas seulement à la revue manuelle (`approve()`). (B) Côté PWA, faire en sorte que le success-screen récupère la story par polling court quand elle n'est pas encore prête, expose un bouton « Partager » natif (`navigator.share` avec image) pour toute annonce avec une image (story brandée, sinon photo brute en repli), et route Facebook vers le partage natif sur mobile.

**Architecture:** **API** — dans `apps/api/src/moderation/moderation.service.ts`, après la transaction de `publish(...)`, si `status === 'approved'`, déclencher `this.storyImageService.generateAndStoreForListing(listing.id)` en fire-and-forget `.catch()` (miroir exact du hook déjà présent dans `approve()`). Aucune nouvelle dépendance (`StoryImageService` déjà injecté). **PWA** — `App/features/post/post-flow-controller.mjs` : généraliser `shareStoryImageNative` pour accepter une `imageUrl` de repli (ne plus exiger `storyImageUrl`). `App/features/post/success-screen.mjs` : rendre `share-native` dès qu'une image (story OU photo brute) est disponible, en portant l'URL d'image partageable via un attribut dédié. `App/app.js` : polling court `listingsService.getListingDetail(slug)` pour récupérer `storyImageUrl` après publication ; router `handleFacebookShare` vers le natif quand `canShareStoryImage()`.

**Tech Stack:** NestJS + TypeScript (`apps/api`, custom `node --test` runner via `scripts/run-tests.mjs`), Vanilla JS ESM (`App/`), `node --test tests/*.test.mjs`.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append, after the latest existing entry, before the "Legacy docs" trailer:

```
- `2026-05-31-zwibba-native-story-share-design.md`
- `2026-05-31-zwibba-native-story-share-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "native-story-share" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index native-story-share plans"
```

---

### Task 2: Failing test — publish() generates the story image for approved listings

**Files:**
- Create: `apps/api/test/moderation/story-image-on-publish.test.ts`

**Step 1: Write the failing test**

Mirror `apps/api/test/moderation/story-image-on-approve.test.ts`. Construire un `ModerationService` avec mocks et appeler `publish(...)`. Le constructeur réel est `new ModerationService(<arg0>, prismaService, storyImageService)` (3 args, cf. le test approve existant qui passe `{} as any` en premier). Mocker `prismaService` pour couvrir le chemin de `publish` : `$transaction(cb)` qui exécute `cb` avec un `transaction` exposant `listing.upsert` (renvoie `{ id: 'l1', slug: 'x' }`) et `moderationDecision.upsert`. Fournir un draft valide menant à `status === 'approved'` (réutiliser les helpers/fixtures déjà présents dans les tests de publish s'il y en a ; sinon construire l'input minimal attendu par `publish`). Asserts :

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { ModerationService } from '../../src/moderation/moderation.service';

async function flushMicrotasks() { await new Promise((r) => setImmediate(r)); }

test('publish schedules story image generation fire-and-forget for an approved listing', async () => {
  const calls: string[] = [];
  const storyImageService = { generateAndStoreForListing: async (id: string) => { calls.push(id); return { storyImageUrl: 'u' }; } };
  // prismaService mock with $transaction -> upsert returning { id: 'l1', slug: 'x' }, etc.
  const service = new ModerationService(/* arg0 */ {} as any, prismaService as any, storyImageService as any);
  const result = await service.publish(approvedPublishInput);
  assert.equal(result.status, 'approved');
  await flushMicrotasks();
  assert.deepEqual(calls, ['l1']);
});

test('publish does not generate a story image when the listing is not approved', async () => {
  // input leading to pending_manual_review / blocked -> calls stays []
});

test('publish returns ok even if story image generation throws', async () => {
  // storyImageService.generateAndStoreForListing throws -> assert.doesNotReject
});
```

Lire `publish(...)` (l.~210-318) et le test approve existant pour reproduire fidèlement la forme des mocks et de l'input avant d'écrire — ne pas inventer la signature de l'input.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test` (puis filtrer la sortie sur `story-image-on-publish`)
Expected: FAIL — `publish()` n'appelle pas encore `generateAndStoreForListing`.

**Step 3: Commit**

```bash
git add apps/api/test/moderation/story-image-on-publish.test.ts
git commit -m "test: cover story image generation on publish"
```

---

### Task 3: Generate the story image on approved publish

**Files:**
- Modify: `apps/api/src/moderation/moderation.service.ts`

**Step 1: Write the code**

Dans `publish(...)`, après le `await this.prismaService.$transaction(...)` qui retourne `listing`, et avant le `return { ... }`, ajouter — uniquement quand `status === 'approved'` — le hook fire-and-forget identique à celui d'`approve()` :

```ts
if (status === 'approved') {
  void this.storyImageService
    .generateAndStoreForListing(listing.id)
    .catch((error) => {
      console.warn(`[moderation] story image generation failed for ${listing.id}`, error);
    });
}
```

Ne rien attendre (réponse instantanée), ne pas modifier la valeur de retour de `publish`.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test`
Expected: PASS — `story-image-on-publish` vert, et `story-image-on-approve` + le reste de la suite moderation toujours verts.

**Step 3: Commit**

```bash
git add apps/api/src/moderation/moderation.service.ts
git commit -m "feat: bake story image on approved publish"
```

---

### Task 4: Failing test — native share accepts a fallback image

**Files:**
- Modify: `tests/post-flow.test.mjs`

**Step 1: Write the failing test**

Lire d'abord les tests existants de `shareStoryImageNative`/`canShareStoryImage` dans `tests/post-flow.test.mjs` pour réutiliser leur stub de `navigatorObject`/`fetchFn`. Ajouter :

```js
test('shareStoryImageNative shares a fallback image when no story image is given', async () => {
  const shared = [];
  const navigatorObject = { share: async (d) => { shared.push(d); }, canShare: () => true };
  await shareStoryImageNative({
    fetchFn: async () => ({ blob: async () => new Blob([new Uint8Array([1])], { type: 'image/jpeg' }) }),
    fileCtor: File,
    navigatorObject,
    imageUrl: 'https://cdn/photo.jpg',   // fallback (no storyImageUrl)
    listingUrl: 'https://zwibba.com/annonce/x/',
    title: 'X',
  });
  assert.equal(shared.length, 1);
  assert.ok(shared[0].files?.length === 1);
});

test('shareStoryImageNative throws only when no image at all is available', async () => {
  await assert.rejects(() => shareStoryImageNative({
    navigatorObject: { share: async () => {}, canShare: () => true },
    fileCtor: File,
    listingUrl: 'https://zwibba.com/annonce/x/',
    title: 'X',
  }));
});
```

Adapter aux noms d'arguments réels du fichier (le test existant montre la forme exacte). Si l'environnement de test n'a pas `Blob`/`File` globaux, les importer via `node:buffer`/`node:buffer`-like comme le font les tests voisins.

**Step 2: Run test to verify it fails**

Run: `node --test tests/post-flow.test.mjs`
Expected: FAIL — `shareStoryImageNative` lève aujourd'hui dès que `storyImageUrl` est absent et n'accepte pas `imageUrl`.

**Step 3: Commit**

```bash
git add tests/post-flow.test.mjs
git commit -m "test: cover native share with fallback image"
```

---

### Task 5: Generalize shareStoryImageNative to a fallback image

**Files:**
- Modify: `App/features/post/post-flow-controller.mjs`

**Step 1: Write the code**

Élargir `shareStoryImageNative({ ... })` : accepter un paramètre `imageUrl` ; résoudre l'image effective `const effectiveImage = storyImageUrl || imageUrl;`. Ne lever « Partage natif indisponible. » que si **aucune** image (`!effectiveImage`) ou si `navigator.share`/`fileCtor` manquent. Le reste inchangé (fetch → File → `navigator.share({ files, text, title, url })`). `storyImageUrl` reste accepté comme avant (rétro-compatible).

**Step 2: Run test to verify it passes**

Run: `node --test tests/post-flow.test.mjs`
Expected: PASS — nouveaux tests verts, tests existants de `shareStoryImageNative`/`canShareStoryImage` toujours verts.

**Step 3: Commit**

```bash
git add App/features/post/post-flow-controller.mjs
git commit -m "feat: native share accepts a fallback image"
```

---

### Task 6: Failing test — success-screen exposes a shareable image for any listing

**Files:**
- Modify: `tests/success-screen.test.mjs`

**Step 1: Write the failing test**

Le helper `buildApprovedContext` accepte déjà `storyImageUrl`. Ajouter un cas **sans** story image (annonce normale) où la photo brute existe (`draft.photos[0].publicUrl`). Asserts :

```js
test('success screen exposes a native share affordance even without a story image', () => {
  const html = renderSuccessScreen(buildApprovedContext({ storyImageUrl: '' }));
  assert.match(html, /data-action="share-native"/);
  // l'image partageable de repli (photo brute) est portée par un attribut dédié
  assert.match(html, /data-share-image-url="https:\/\/cdn\/photo\.jpg"/);
  // le téléchargement de story reste réservé au cas story image
  assert.doesNotMatch(html, /data-action="download-story-image"/);
});
```

Conserver les tests existants (le cas avec `storyImageUrl` doit toujours rendre `share-native` ET `download-story-image`). Choisir le nom d'attribut `data-share-image-url` (distinct de `data-story-image-url`).

**Step 2: Run test to verify it fails**

Run: `node --test tests/success-screen.test.mjs`
Expected: FAIL — `share-native` n'est rendu aujourd'hui que dans la branche `storyImageUrl`.

**Step 3: Commit**

```bash
git add tests/success-screen.test.mjs
git commit -m "test: native share affordance for listings without story image"
```

---

### Task 7: Render the native share affordance for any listing

**Files:**
- Modify: `App/features/post/success-screen.mjs`

**Step 1: Write the code**

Calculer `const shareImageUrl = storyImageUrl || primaryImageUrl;`. Sortir le bouton `share-native` de la branche `storyImageUrl ? ...` : le rendre dès que `shareImageUrl` est non vide, en lui posant `data-share-image-url="${escapeAttribute(shareImageUrl)}"` (et conserver `data-story-image-url` quand la vraie story existe, pour le bouton `download-story-image` qui reste, lui, conditionné à `storyImageUrl`). Le `data-share-title` reste le titre de l'annonce. Le masquage runtime desktop (App/app.js) gère l'absence de `navigator.share`.

**Step 2: Run test to verify it passes**

Run: `node --test tests/success-screen.test.mjs`
Expected: PASS — nouveau cas + cas existants verts.

**Step 3: Commit**

```bash
git add App/features/post/success-screen.mjs
git commit -m "feat: expose native share for any listing image"
```

---

### Task 8: Wire native share, facebook routing, and story polling in app.js

**Files:**
- Modify: `App/app.js`

**Step 1: Write the code**

1. `handleNativeStoryShare(trigger)` : lire `trigger.dataset.shareImageUrl` en plus de `storyImageUrl`, et passer `imageUrl: trigger.dataset.shareImageUrl` à `shareStoryImageNative` (repli photo brute). Le cas story image (`data-story-image-url`) reste prioritaire si présent.
2. `handleFacebookShare(rawListingUrl, trigger)` : si `canShareStoryImage()` (mobile, Web Share fichiers dispo), router vers le partage natif (même chemin que `share-native`, en réutilisant l'image partageable disponible) ; sinon conserver `window.open(sharer.php)`. Adapter le délégateur de clic `share-facebook` pour transmettre le `trigger`.
3. Masquage runtime (~l.1106) : masquer `share-native` uniquement si `!canShareStoryImage()` — inchangé dans son principe, mais le bouton est désormais présent même sans story image, donc le masquage desktop continue de s'appliquer correctement.
4. Polling story : après publication (là où `state.publishedListingRoute`/`publishedListingUrl` sont posés, ~l.1602), si `result.outcome.status === 'approved'` et `result.outcome.storyImageUrl` est absent mais `result.outcome.listingSlug` présent, lancer un polling court non bloquant : `listingsService.getListingDetail(slug, { session })` toutes les ~2 s, max ~5 tentatives ; à la première réponse avec `storyImageUrl`, stocker dans l'état et `renderApp()` pour que les affordances utilisent la story brandée. Le polling s'arrête au succès, à l'épuisement des tentatives, ou si l'utilisateur quitte le success-screen. Réutiliser l'instance `listingsService` déjà construite dans `app.js`.

**Step 2: Verify**

Run: `node --test` (toute la suite App) puis `npm run build`
Expected: suite verte (aucune régression), build OK. Spot-check : `rg -n "shareImageUrl|getListingDetail|canShareStoryImage" App/app.js | head` montre le repli image, le polling et le routage Facebook.

Note de couverture : la logique de polling (timers) et le routage natif dépendent du runtime navigateur, non couverts par les tests unitaires existants — vérification manuelle post-déploiement, comme convenu avec Yves. Les parties testables (rendu success-screen, helper de partage, hook publish) le sont aux Tasks 2-7.

**Step 3: Commit**

```bash
git add App/app.js
git commit -m "feat: native share fallback, facebook routing and story polling"
```

---

### Task 9: Full-suite verification, build and website smoke

**Files:**
- (none — cross-cutting verification)

**Step 1: Run the full checks**

```bash
npm install
node --test tests/*.test.mjs
pnpm -C apps/api test
npm run build
npm run smoke:website
```

Expected: `tests/*.test.mjs` vert, suite `apps/api` verte (dont `story-image-on-publish` et `story-image-on-approve`), build et smoke OK. (`npm install` requis dans un worktree neuf, sinon `tests/live-beta-helpers.test.mjs` échoue à tort sur `playwright`.)

**Step 2: Spot-check**

Run: `rg -n "generateAndStoreForListing" apps/api/src/moderation/moderation.service.ts`
Expected: l'appel apparaît dans `approve()` **et** dans `publish()`.

**Step 3:** Skip the commit step for this task because no file was modified.
