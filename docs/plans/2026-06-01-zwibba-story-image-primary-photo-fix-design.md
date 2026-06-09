# Zwibba Story Image Primary Photo Fix Design

**Date:** 2026-06-01

## Goal

Corriger la génération server-side de la story image pour qu'elle résolve la photo principale d'une annonce via le draft (`draft.photos`) au lieu d'un champ `listing.primaryImageUrl` inexistant — ce qui débloque la compilation TypeScript du service `apps/api` et permet enfin de déployer la feature story image en production.

## Problem

`apps/api/src/share/story-image.service.ts` (méthode `generateAndStoreForListing`) fait `await fetchImpl(listing.primaryImageUrl)`. Or le modèle Prisma `Listing` (`apps/api/prisma/schema.prisma`, model `Listing` ~l.82) n'a **aucun** champ `primaryImageUrl` — il n'a que `storyImageUrl`. Les photos d'une annonce vivent sur le `Draft` lié (`Listing.draftId` → `Draft.photos: DraftPhoto[]`).

Conséquence : `npm run build` (= `tsc`) du service api échoue avec `error TS2339: Property 'primaryImageUrl' does not exist on type Listing`, ce qui fait échouer tout déploiement GitHub de l'API (constaté le 2026-06-01 sur le build du merge #16). Le bug est resté invisible jusqu'ici parce que (a) la feature story image n'avait jamais été compilée/déployée sur l'API depuis sa création le 2026-05-27, et (b) le test existant `apps/api/test/share/story-image.service.test.ts` mocke un objet listing **avec** un faux `primaryImageUrl` et tourne via `tsx` (transpile sans vérification de type stricte), donc il passe au vert malgré l'incohérence avec le schéma réel.

Le pattern correct de résolution d'image existe déjà dans `apps/api/src/listings/listings.service.ts` : `resolveListingImages(listing)` charge `draft.findUnique({ where: { id: listing.draftId }, include: { photos: true } })` puis applique `getListingImageUrls(photos)` — fonction qui filtre les photos `uploadStatus === 'uploaded'` avec `publicUrl`, trie celles de `sourcePresetId === 'capture'` en premier, puis par date, et renvoie les `publicUrl`. La première entrée est la photo principale.

## Non-Goals

- Ne pas ajouter de champ `primaryImageUrl` au modèle Prisma `Listing` (migration inutile : la donnée est déjà disponible via le draft).
- Ne pas refactorer `getListingImageUrls`/`resolveListingImages` dans `listings.service.ts` ni les exporter ; on réplique la logique minimale nécessaire dans le module share pour le garder autonome (la fonction est privée et non exportée aujourd'hui).
- Ne pas modifier le hook fire-and-forget dans `moderation.service.ts` (`approve` et `publish`) — il appelle `generateAndStoreForListing(listingId)`, signature inchangée.
- Ne pas toucher à `compose-story-image.ts`, R2, ni au flux PWA. Scope = `apps/api/src/share/story-image.service.ts` + son test.
- Ne pas régénérer rétroactivement les story images existantes.

## Existing System

**story-image.service.ts** — `generateAndStoreForListing(listingId)` : charge le listing, fetch `listing.primaryImageUrl` (bug), compose via `composeStoryImage`, upload R2, persiste `storyImageUrl`. Le `composeStoryImage` attend `{ photoBuffer, title, zoneLabel, priceLabel }`.

**listings.service.ts** — `resolveListingImages(listing)` (~l.330) et `getListingImageUrls(photos)` (~l.162) : la référence pour résoudre l'URL de la photo principale depuis `draft.photos`. Type `PersistedDraftPhotoRecord` = `{ publicUrl, uploadStatus, sourcePresetId?, createdAt?, id?, objectKey? }`.

**schema.prisma** — `Listing.draftId` lie au `Draft`, `Draft.photos` est une relation `DraftPhoto[]`. `DraftPhoto` a `publicUrl`, `uploadStatus`, `sourcePresetId`, `createdAt`.

**test/share/story-image.service.test.ts** — mocke `prismaService.listing.findUnique` renvoyant un objet avec `primaryImageUrl`. Devra être adapté pour mocker `draft.findUnique` avec `photos`.

## Recommended Architecture

### 1. Résoudre la photo principale via le draft

Dans `generateAndStoreForListing`, après avoir chargé le `listing`, charger le draft associé : `prismaService.draft.findUnique({ where: { id: listing.draftId }, include: { photos: true } })`. Calculer l'URL de la photo principale par la même logique que `getListingImageUrls` : filtrer les photos `uploadStatus === 'uploaded'` ayant un `publicUrl`, trier `sourcePresetId === 'capture'` d'abord puis par `createdAt` croissant, prendre la première `publicUrl`. Remplacer `fetchImpl(listing.primaryImageUrl)` par `fetchImpl(primaryImageUrl)`.

### 2. Gestion de l'absence de photo

Si aucune photo exploitable n'est trouvée (draft absent, ou aucune photo `uploaded`), ne pas tenter le fetch : lever une erreur explicite (ex. `No primary image for listing {id}`). Le hook appelant dans `moderation.service.ts` est déjà `fire-and-forget` avec `.catch()` qui logge sans propager — donc une annonce sans photo ne bloquera pas la publication, elle restera simplement sans story image (comportement acceptable, identique à aujourd'hui).

### 3. Helper local de résolution

Extraire la logique de sélection dans une petite fonction privée du module (`resolvePrimaryPhotoUrl(photos)`) typée sur la forme `DraftPhoto` (publicUrl, uploadStatus, sourcePresetId?, createdAt?), pour garder `generateAndStoreForListing` lisible et la rendre testable. Ne pas dépendre de `listings.service.ts` (couplage inter-modules évité ; la fonction y est privée).

### 4. Mise à jour du test

Adapter `test/share/story-image.service.test.ts` : le mock `prismaService` expose désormais `listing.findUnique` (renvoyant `{ id, draftId, title, area, priceAmount, priceCurrency }`, **sans** `primaryImageUrl`) et `draft.findUnique` (renvoyant `{ id, photos: [{ publicUrl, uploadStatus: 'uploaded', sourcePresetId: 'capture' }] }`). Asserter que le fetch est appelé avec l'URL de la photo principale, que R2 reçoit le PNG, et que `storyImageUrl` est persisté. Ajouter un cas « aucune photo uploaded → rejette ». Ces tests refléteront le schéma réel. La garantie anti-régression de type est apportée par `tsc` au build (Task de vérification finale : `pnpm -C apps/api build` doit réussir).
