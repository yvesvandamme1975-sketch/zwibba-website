# Zwibba Native Story Share Design

**Date:** 2026-05-31

## Goal

Permettre le partage d'une annonce **en story** (WhatsApp Status, Facebook/Instagram Stories) depuis le success-screen, pour toute annonce publiée, via le partage natif du téléphone (`navigator.share` avec une image story brandée photo+prix+ville). Cela suppose (a) que la story image brandée soit générée pour **toutes** les annonces approuvées, pas seulement celles passées par la revue manuelle admin, et (b) que le success-screen sache attendre et récupérer cette image quand elle devient disponible.

## Problem

Trois constats vérifiés dans `codex/website-vitrine-backup`.

**La story n'est générée que sur la voie admin.** `apps/api/src/moderation/moderation.service.ts` : `approve(listingId)` (l.351) déclenche `this.storyImageService.generateAndStoreForListing(listingId)` en fire-and-forget (l.391). Mais la publication normale passe par `publish(...)` (l.~230-318), qui crée/upsert le listing avec `moderationStatus: 'approved'` + `publishedAt` directement quand l'annonce est auto-approuvée (`resolveModerationStatus`), **sans jamais appeler la génération de story**. Conséquence structurelle : toute annonce auto-approuvée — le cas courant — a `storyImageUrl = null`. C'est pourquoi l'annonce testée par l'utilisateur n'avait pas de story et le bouton « Partager en story » était absent.

**Le bouton story est doublement conditionné.** `App/features/post/success-screen.mjs` ne rend `data-action="share-native"` que dans la branche `storyImageUrl ? ... : ''`, et `App/app.js` (~l.1106) le masque encore si `canShareStoryImage()` est faux. Sans story image, aucun chemin de partage story.

**Facebook via sharer.php est instable sur mobile.** `handleFacebookShare` (`App/app.js` ~l.1824) ouvre toujours `https://www.facebook.com/sharer/sharer.php?u=<url>`, qui sur mobile ouvre souvent le fil au lieu du composeur et ne permet pas de poster en story.

Limites de plateforme à acter (hors de notre contrôle) : WhatsApp n'expose aucune URL pour poster en Status ; Facebook `sharer.php` ne cible pas les stories. Le partage natif `navigator.share({files})` est la seule voie story-capable côté navigateur — et la destination réelle (Status, Story, Envoyer) est décidée par l'OS et chaque app, pas par nous.

## Non-Goals

- Ne pas rendre la publication bloquante : `publish()` ne doit pas attendre la génération de la story avant de répondre (elle prend 3-5 s : download photo + composite Sharp + upload R2). La génération reste fire-and-forget ; c'est le client qui récupère l'URL quand elle est prête.
- Ne pas régénérer rétroactivement les story images des annonces déjà publiées avant ce changement (backfill séparé si besoin).
- Ne pas tenter d'ouvrir directement WhatsApp Status / Facebook Stories par une URL : aucune API publique ne le permet.
- Ne pas toucher au rendu OG serveur (feature précédente, en prod).
- Ne pas toucher au flux mobile Flutter (`apps/mobile/`). Scope = `apps/api/src/moderation/` + `App/`.
- Ne pas supprimer le bouton WhatsApp « chat » ni « Copier le lien » : ils restent utiles, surtout en repli desktop.

## Existing System

**Génération story (API)** — `apps/api/src/share/story-image.service.ts` : `generateAndStoreForListing(listingId)` charge le listing, fetch `primaryImageUrl`, compose via `composeStoryImage({ photoBuffer, title, zoneLabel, priceLabel })`, upload `listings/{id}/story.png` sur R2, et persiste `storyImageUrl`. Exporté par `ShareModule`. `ModerationService` l'injecte déjà (constructeur l.157) et l'invoque dans `approve()` mais **pas** dans `publish()`.

**Lecture par slug (API + client)** — `GET /listings/:slug` → `getListingDetail` renvoie `storyImageUrl` (l.316). Côté client, `App/services/listings-service.mjs` expose `getListingDetail(slug, { session })` (l.34) qui fetch cet endpoint. `publish()` renvoie déjà `{ id, listingSlug, status, shareUrl, ... }`.

**Partage natif (client)** — `App/features/post/post-flow-controller.mjs` : `canShareStoryImage({...})` teste `navigator.share` + `canShare({files})` ; `shareStoryImageNative({ storyImageUrl, listingUrl, title, ... })` fetch l'image (CORS R2 vérifié OK depuis le domaine du site), en fait un `File`, et appelle `navigator.share({ files, text, title, url })`. `App/app.js` : `handleNativeStoryShare`, `handleFacebookShare`, `handleWhatsAppShare`, et le délégateur de clic.

**Success-screen** — `renderSuccessScreen({ draft, listingUrl, outcome })` calcule `primaryImageUrl` et `storyImageUrl = outcome?.storyImageUrl`. C'est le point où l'on doit gérer l'attente de la story.

## Recommended Architecture

### 1. Générer la story aussi à la publication auto-approuvée

Dans `moderation.service.ts`, après la transaction de `publish(...)`, lorsque `status === 'approved'`, déclencher `this.storyImageService.generateAndStoreForListing(listing.id)` en **fire-and-forget** avec `.catch()` qui logge sans propager — exactement le même pattern que dans `approve()` (l.391). La réponse de `publish()` reste instantanée. Aucune nouvelle dépendance : `StoryImageService` est déjà injecté. C'est la correction de fond qui fait que **toute** annonce approuvée obtient une story.

### 2. Le success-screen récupère la story quand elle est prête (polling court)

Au montage du success-screen pour une annonce `approved`, si `outcome.storyImageUrl` est absent mais qu'on a un `listingSlug`, le client affiche un état discret « préparation du visuel de partage… » et lance un polling court via `listingsService.getListingDetail(slug)` (par ex. toutes les ~2 s, plafonné à ~5 tentatives / ~10 s). Dès que `storyImageUrl` est renvoyé, on met à jour l'état et on réactive les affordances de partage natif avec cette image. Si le délai expire, on retombe sur le repli (axe 4). Le polling vit dans `App/app.js` (état `state.publishedStoryImageUrl` ou équivalent) et ne bloque jamais l'UI.

### 3. Bouton « Partager » natif unique sur mobile

Sur mobile (quand `canShareStoryImage()` est vrai), le success-screen présente **un** bouton principal « Partager » (`share-native`) qui déclenche `navigator.share({ files: [storyImage] })` — c'est lui qui donne accès à Status WhatsApp, Story Facebook, Instagram, etc. On évite la redondance de boutons par plateforme qui ouvriraient tous la même feuille système. À côté, on conserve en secondaire : WhatsApp **chat** (`share-whatsapp-chat`, partage à un contact, déjà fonctionnel) et « Copier le lien ». Sur desktop (`navigator.share` absent), le bouton natif est masqué et l'on garde Facebook `sharer.php` + WhatsApp + copier le lien.

### 4. Repli quand la story n'est pas (encore) prête

Tant que `storyImageUrl` n'est pas disponible (polling en cours ou échoué), le bouton natif utilise une image de repli = la photo brute (`primaryImageUrl`, déjà résolue). Pour cela, généraliser `shareStoryImageNative` (ou son appelant) à accepter une image générique : ne plus lever quand `storyImageUrl` manque si une `imageUrl` de repli est fournie. Ainsi le partage natif fonctionne immédiatement avec la photo brute, puis bascule sur la story brandée dès qu'elle arrive. Le téléchargement d'image (`download-story-image`) reste, lui, réservé à la vraie story image.

### 5. Facebook : natif sur mobile, sharer.php en repli desktop

`handleFacebookShare` devient conditionnel : si `canShareStoryImage()` (mobile, Web Share fichiers dispo), router vers le même partage natif que `share-native` (l'utilisateur choisit Story FB ou post) ; sinon (desktop), conserver `window.open(sharer.php)`. Si l'axe 3 retient un bouton natif unique sur mobile, le bouton Facebook peut être masqué sur mobile (couvert par « Partager ») et n'apparaître qu'en desktop — à trancher à l'implémentation pour garder les tests existants verts et l'UX cohérente.

### 6. Tests

API : étendre `apps/api/test/moderation/` — un test sur `publish()` avec un mock `StoryImageService` asserttant que `generateAndStoreForListing(listingId)` est appelé (fire-and-forget, après tick) quand `status === 'approved'`, et **pas** appelé quand le statut est `pending_manual_review`/`blocked` ; un test que `publish()` renvoie OK même si le mock throw. Client : étendre `tests/post-flow.test.mjs` — `shareStoryImageNative` partage avec une `imageUrl` de repli sans `storyImageUrl`, et lève seulement si aucune image. `tests/success-screen.test.mjs` — le bouton `share-native` est rendu dès qu'une image (story ou photo brute) est disponible ; `download-story-image` reste conditionné à `storyImageUrl`. Le polling lui-même (timers) n'est pas testé en e2e — vérification manuelle post-déploiement, comme convenu.
