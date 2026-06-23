# Zwibba Review Report Design

**Date:** 2026-06-23

## Goal

Permettre à un utilisateur vérifié de signaler un avis abusif ou faux, et faire remonter ces signalements dans une file de modération admin où un modérateur peut soit rejeter le signalement, soit supprimer l'avis.

## Problem

Les avis sont publics et ouverts à toute session vérifiée (Vague 2) : il n'existe aucun recours contre un avis abusif, diffamatoire ou faux. Aucun modèle `ReviewReport` n'existe, et l'app admin (`apps/admin/`) ne dispose que d'une file de modération d'annonces, pas d'avis. Sans boucle de traitement côté admin, un simple bouton « Signaler » ne mènerait nulle part — c'est ce qui rend ce chantier plus lourd que la réponse vendeur, et pourquoi il dépend de l'admin.

Ce plan est séquencé **après** `seller-review-reply`, qui expose déjà l'`id` de chaque avis dans la projection publique de `getPublicSeller` ; le bouton de signalement s'appuie sur cet `id`.

## Non-Goals

- Pas de retrait automatique d'avis sur seuil de signalements : toute suppression passe par une décision admin explicite.
- Pas de statut de signalement remonté au signaleur, ni d'historique, ni de workflow d'appel.
- Pas de notification (e-mail/push) au vendeur ou à l'acheteur.
- Pas d'édition d'avis ni de réponse vendeur (plan séparé `seller-review-reply`).
- Pas d'authentification ajoutée aux endpoints admin : ils suivent le modèle interne existant de `moderation.controller` (réseau interne, non gardés). L'endpoint de signalement côté PWA, lui, reste derrière `SessionAuthGuard`.
- Pas de changement du modèle mobile Flutter (`apps/mobile/`).

## Existing System

Le modèle `Review` (`apps/api/prisma/schema.prisma`) porte `id`, `listingId`, `buyerUserId`, `sellerPhoneNumber`, `rating`, `comment`, timestamps. La projection publique `ProfileService.getPublicSeller` expose l'`id` de chaque avis (via le plan `seller-review-reply`). Le rendu d'un avis est `renderReviewCard` dans `App/features/profile/seller-public-screen.mjs`.

La modération d'annonces fournit le patron à suivre. Côté API, `apps/api/src/moderation/moderation.controller.ts` (`@Controller('moderation')`) expose `GET /moderation/queue`, `POST /moderation/:listingId/approve`, `POST /moderation/:listingId/block` — non gardés, appelés depuis le réseau interne. Côté admin, `apps/admin/src/server.ts` est un serveur HTTP Node qui `fetch ${apiBaseUrl}/moderation/queue`, route les actions POST vers `${apiBaseUrl}/moderation/:id/:action`, et rend `apps/admin/src/moderation/moderation-page.ts` (HTML avec formulaires). Les tests admin vivent sous `apps/admin/test/` (runner `pnpm -C apps/admin test`).

## Recommended Architecture

### 1. Modèle `ReviewReport` (migration additive)

Ajouter `model ReviewReport` : `id`, `review Review @relation(onDelete: Cascade)` + `reviewId`, `reporter User @relation(onDelete: Cascade)` + `reporterUserId`, `reason String`, `status String @default("pending")`, `createdAt DateTime @default(now())`. Contrainte `@@unique([reviewId, reporterUserId])` (un signalement par utilisateur et par avis, anti-spam), `@@index([status])` pour la file. Ajouter les relations inverses `reports ReviewReport[]` sur `Review` et `User`. Migration strictement additive. La cascade depuis `Review` garantit que supprimer un avis supprime ses signalements.

### 2. Endpoint de signalement — côté acheteur (authentifié)

Exposer `POST /reviews/:reviewId/report` derrière `SessionAuthGuard`, prenant `{ reason }`. Le service (`ReviewReportsService`) : charge l'avis par `id` (404 si absent) ; valide `reason` contre un ensemble fermé (`spam`, `offensive`, `fake`, `other`) ; résout le `reporterUserId` depuis la session ; puis fait un **upsert** sur `(reviewId, reporterUserId)` pour qu'un même utilisateur ne crée pas de doublons. Contrôleur et service en injection explicite `@Inject(Token)`. Le client `App/services/` gagne un `review-reports-service.mjs` avec `reportReview({ reviewId, reason, session })`.

### 3. Endpoints admin de traitement — interne (modèle moderation)

Exposer, sur le modèle non gardé de `moderation.controller`, trois routes : `GET /review-reports/queue` (signalements `pending`, joints au contexte avis + annonce : extrait du commentaire, note, vendeur, raison, date) ; `POST /review-reports/:reportId/dismiss` (passe le signalement à `dismissed`) ; `POST /review-reports/:reportId/remove-review` (supprime l'avis ciblé — la cascade efface les signalements liés). Le service `ReviewReportsService` porte aussi `listQueue`, `dismiss`, `removeReview`, avec accès Prisma défensif (`review?.`, `reviewReport?.`) pour ne pas casser les faux Prisma étroits des tests voisins.

### 4. App admin — file et actions

Étendre `apps/admin/src/server.ts` pour charger la file via `fetch ${apiBaseUrl}/review-reports/queue` et router deux actions POST (`/review-reports/:id/dismiss`, `/review-reports/:id/remove-review`) vers l'API. Créer `apps/admin/src/moderation/review-reports-page.ts` (rendu HTML calqué sur `moderation-page.ts` : un item par signalement avec extrait d'avis, raison, et deux formulaires « Rejeter » / « Supprimer l'avis »). L'exposer dans la navigation admin existante.

### 5. PWA — bouton Signaler sur l'avis

Étendre `renderReviewCard` (`App/features/profile/seller-public-screen.mjs`) pour ajouter, sur chaque avis et pour un viewer vérifié qui n'est ni l'auteur de l'avis ni le vendeur, un bouton « Signaler » (`data-action="report-review"`, `data-review-id`) ouvrant un sélecteur de raison, puis confirmation après envoi. Câbler l'action dans `App/app.js` via `review-reports-service.mjs`. Le rendu reste léger pour le terrain RDC.
