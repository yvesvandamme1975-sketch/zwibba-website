# Zwibba Simplify Success Share Design

**Date:** 2026-06-09

## Goal

Remplacer les cinq boutons de partage du success-screen (WhatsApp, Facebook, Story, Télécharger image, Copier lien) par un seul bouton "Partager" qui ouvre la sheet native de l'OS, en miroir exact du comportement déjà déployé sur le listing detail screen.

## Problem

Le success-screen après publication affiche cinq actions de partage distinctes : "Partager sur WhatsApp", "Partager sur Facebook", "Partager en story", "Télécharger l'image", et "Copier le lien" (`App/features/post/success-screen.mjs` l.138-196). Sur iOS, les trois premiers ouvrent tous le même modal système (la Share Sheet) ou un fallback web équivalent. Le résultat est confus : cinq boutons qui mènent au même endroit, et le vendeur ne sait pas lequel choisir.

Le listing detail screen (`App/features/listings/listing-detail-screen.mjs`), déployé le 2026-06-08, a déjà la bonne UX : un seul bouton "Partager" qui appelle `navigator.share()` avec l'image story en pièce jointe si disponible, sinon partage le lien seul, avec fallback clipboard. Ce pattern est validé en production.
## Non-Goals

- Ne pas modifier le template de l'image story (`apps/api/src/share/compose-story-image.ts`). Le header vient d'être agrandi séparément.
- Ne pas toucher au listing detail screen. Son bouton partage est déjà correct.
- Ne pas supprimer "Voir mon annonce" ni "Booster cette annonce" ni "Retour à l'accueil". Seuls les cinq boutons de partage sont remplacés.
- Ne pas modifier les handlers côté `App/app.js` pour les anciennes actions. Ils restent en place pour rétrocompatibilité mais ne sont plus appelés depuis le success-screen.
- Ne pas toucher au flux mobile Flutter.

## Existing System

**Success screen** — `App/features/post/success-screen.mjs` : `renderSuccessScreen({ draft, listingUrl, listingRoute, outcome, ... })`. Quand `content.showShareActions` est true (status `approved` avec `listingUrl` non vide), cinq boutons de partage sont rendus : WhatsApp (`share-whatsapp-chat`), Facebook (`share-facebook`), Story native (`share-native`, conditionné à `shareImageUrl`), Télécharger (`download-story-image`, conditionné à `storyImageUrl`), et Copier le lien (`copy-listing-link`). Suivis de "Voir mon annonce" et "Booster".

**Partage unifié existant** — Le listing detail screen utilise `data-action="share-listing"` avec `data-share-slug`, `data-share-title`, `data-share-url`. Le handler dans `App/app.js` (`handleListingShare`) gère `shareStoryImageNative()` → `navigator.share()` → clipboard fallback, puis `recordListingShare()`.

**Données disponibles au success screen** — `outcome.listingSlug`, `listingUrl` (format `/annonce/{slug}/`), `outcome.storyImageUrl`, `draft.details.title`.

## Recommended Architecture

### 1. Remplacer les cinq boutons par un seul "Partager"

Dans `success-screen.mjs`, remplacer le bloc des cinq boutons de partage par un seul bouton `data-action="share-listing"` avec les mêmes data-attributes que le detail screen. Le handler existant `handleListingShare` dans `app.js` fait le reste. Ce bouton est le CTA principal (style `app-flow__button`, vert gradient), label "Partager mon annonce".

### 2. Conserver "Copier le lien" comme fallback secondaire

Garder un bouton "Copier le lien" en style secondaire en dessous, pour les navigateurs sans `navigator.share`.

### 3. Ordre final des actions

Après simplification : "Partager mon annonce" (primaire), "Voir mon annonce" (secondaire), "Copier le lien" (secondaire), "Booster cette annonce" (secondaire, si disponible), "Retour à l'accueil" (secondaire).

### 4. Couverture de tests

Mettre à jour `tests/success-screen.test.mjs` pour asserter que le bouton `data-action="share-listing"` est présent et que les anciens boutons ne sont plus rendus.