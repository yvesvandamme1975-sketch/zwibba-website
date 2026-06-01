# Zwibba Story Image Primary Photo Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Faire compiler et fonctionner la génération de story image en résolvant la photo principale via `draft.photos` (le listing n'a pas de champ `primaryImageUrl`), pour débloquer le build TypeScript de `apps/api` et permettre le déploiement GitHub de l'API.

**Architecture:** Modifier `apps/api/src/share/story-image.service.ts` : après avoir chargé le `listing`, charger `draft.findUnique({ where: { id: listing.draftId }, include: { photos: true } })`, sélectionner la photo principale via une fonction locale `resolvePrimaryPhotoUrl(photos)` (filtre `uploadStatus === 'uploaded'` + `publicUrl`, tri `sourcePresetId === 'capture'` d'abord puis `createdAt` croissant, première `publicUrl`) calquée sur `getListingImageUrls` de `listings.service.ts`, puis `fetchImpl(primaryImageUrl)`. Lever une erreur explicite si aucune photo. Adapter le test pour mocker `draft.findUnique` et refléter le schéma réel. La régression de type est verrouillée par `tsc` (build) en vérification finale.

**Tech Stack:** NestJS 11 + TypeScript + Prisma 6 (`apps/api`), runner custom `node --test` via `scripts/run-tests.mjs` (commande `pnpm -C apps/api test`), compilation `pnpm -C apps/api build` (= `tsc -p tsconfig.build.json`).

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append, after the latest existing entry, before the "Legacy docs" trailer:

```
- `2026-06-01-zwibba-story-image-primary-photo-fix-design.md`
- `2026-06-01-zwibba-story-image-primary-photo-fix-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "story-image-primary-photo-fix" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index story-image-primary-photo-fix plans"
```

---

### Task 2: Failing test — story image resolves the primary photo from the draft

**Files:**
- Modify: `apps/api/test/share/story-image.service.test.ts`

**Step 1: Write the failing test**

Réécrire `buildMocks()` pour refléter le schéma réel : `prismaService.listing.findUnique` renvoie `{ id: 'l1', draftId: 'd1', title: 'Bague or blanc motif losanges', area: 'Gombe, Kinshasa', priceAmount: 80000, priceCurrency: 'CDF' }` (**sans** `primaryImageUrl`), et ajouter `prismaService.draft.findUnique` renvoyant `{ id: 'd1', photos: [{ publicUrl: 'https://cdn.example.com/photo.jpg', uploadStatus: 'uploaded', sourcePresetId: 'capture', createdAt: new Date() }] }`. Capturer l'URL passée au `fetchImpl` (ex. `fetchedUrls.push(url)`). Asserts du test principal inchangés (R2 reçoit le PNG, `storyImageUrl` persisté) + nouvelle assertion : `assert.equal(fetchedUrls[0], 'https://cdn.example.com/photo.jpg')`.

Ajouter un test : quand `draft.findUnique` renvoie `{ id: 'd1', photos: [] }` (aucune photo uploaded), `generateAndStoreForListing` **rejette** (`await assert.rejects(..., /image/i)`) et n'appelle ni R2 ni `listing.update`.

Conserver le test « listing not found » existant (le mock `listing.findUnique` renvoyant `null`).

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test` (filtrer sur `share/story-image.service`)
Expected: FAIL — le service lit encore `listing.primaryImageUrl` (undefined dans le nouveau mock) et n'interroge pas `draft.findUnique`, donc l'URL fetchée ne correspond pas / le cas « aucune photo » ne rejette pas.

**Step 3: Commit**

```bash
git add apps/api/test/share/story-image.service.test.ts
git commit -m "test: story image resolves primary photo from draft"
```

---

### Task 3: Resolve the primary photo from draft.photos

**Files:**
- Modify: `apps/api/src/share/story-image.service.ts`

**Step 1: Write the code**

Dans `generateAndStoreForListing`, après le chargement du `listing` (et le `if (!listing) throw`) :

1. Charger le draft : `const draft = await this.prismaService.draft.findUnique({ where: { id: listing.draftId }, include: { photos: true } });`
2. Résoudre la photo principale : `const primaryImageUrl = resolvePrimaryPhotoUrl(draft?.photos ?? []);`
3. Si `!primaryImageUrl`, lever `throw new Error(\`No primary image for listing ${listingId}\`);`
4. Remplacer `fetchImpl(listing.primaryImageUrl)` par `fetchImpl(primaryImageUrl)`.

Ajouter en bas du fichier (hors classe ou méthode privée) une fonction `resolvePrimaryPhotoUrl` typée :

```ts
type DraftPhotoLike = {
  publicUrl: string;
  uploadStatus: string;
  sourcePresetId?: string;
  createdAt?: Date;
};

function resolvePrimaryPhotoUrl(photos: DraftPhotoLike[]): string | null {
  const sorted = [...photos]
    .filter((p) => p.uploadStatus === 'uploaded' && p.publicUrl)
    .sort((a, b) => {
      const ra = a.sourcePresetId === 'capture' ? 0 : 1;
      const rb = b.sourcePresetId === 'capture' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return ta - tb;
    });
  return sorted[0]?.publicUrl ?? null;
}
```

Garder `zoneLabel`/`priceLabel`/`title` tels quels (ils viennent du `listing`, champs existants). Ne pas réintroduire de référence à `listing.primaryImageUrl`.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test` (filtrer sur `share/story-image.service`)
Expected: PASS — fetch appelé avec l'URL de la photo `capture`, R2 + update OK, cas « aucune photo » rejette.

**Step 3: Commit**

```bash
git add apps/api/src/share/story-image.service.ts
git commit -m "fix: resolve story image primary photo from draft"
```

---

### Task 4: Verify the API compiles and the full suite passes

**Files:**
- (none — cross-cutting verification)

**Step 1: Run the checks**

```bash
pnpm -C apps/api build
pnpm -C apps/api test
```

Expected: `pnpm -C apps/api build` (= `tsc`) **réussit sans aucune erreur** — en particulier plus de `TS2339: Property 'primaryImageUrl' does not exist`. C'est la vérification centrale de ce plan : c'est ce qui faisait échouer le déploiement GitHub. La suite `apps/api` est verte (story-image + moderation `story-image-on-approve`/`story-image-on-publish` inclus).

**Step 2: Spot-check**

Run: `rg -n "primaryImageUrl|draft.findUnique|resolvePrimaryPhotoUrl" apps/api/src/share/story-image.service.ts`
Expected: plus aucune lecture de `listing.primaryImageUrl` ; `draft.findUnique` et `resolvePrimaryPhotoUrl` présents.

**Step 3:** Skip the commit step for this task because no file was modified.
