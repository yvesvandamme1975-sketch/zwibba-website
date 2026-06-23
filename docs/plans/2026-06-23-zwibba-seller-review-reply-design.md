# Zwibba Seller Review Reply Design

**Date:** 2026-06-23

## Goal

Permettre au vendeur propriétaire d'une annonce de publier une réponse publique unique sous chacun des avis reçus, affichée à tous sous l'avis sur son profil vendeur public.

## Problem

La Vague 2 a livré les avis vendeur (modèle `Review`, `POST /listings/:slug/reviews`, agrégat et liste d'avis sur le profil public) mais la relation est à sens unique : un vendeur visé par un avis n'a aucun droit de réponse. Le modèle `Review` (`apps/api/prisma/schema.prisma`) ne porte aucun champ de réponse, et la projection des avis dans `ProfileService.getPublicSeller` n'expose ni l'`id` de l'avis ni de réponse — elle renvoie seulement `{ buyer: { displayName }, comment, createdAt, rating }`. Sans `id` exposé, le front ne peut pas cibler un avis pour y répondre.

## Non-Goals

- Pas de fil de discussion : une seule réponse par avis (un champ sur `Review`, écrasable par le vendeur, pas un modèle séparé).
- Pas d'historique d'édition ni de horodatage des modifications successives au-delà d'un `sellerReplyAt`.
- Pas de notification à l'acheteur quand le vendeur répond.
- Pas de signalement d'avis (plan séparé `seller-review-report`).
- Pas de modération du contenu côté admin : seul le filtre automatique de `normalizeReviewComment` s'applique à la réponse.
- Pas de changement du modèle mobile Flutter (`apps/mobile/`) : web `App/` et `apps/api/` uniquement.

## Existing System

Le modèle `Review` (`apps/api/prisma/schema.prisma`) porte `id`, `listingId`, `buyerUserId`, `sellerPhoneNumber`, `rating`, `comment`, `createdAt`, `updatedAt`, avec `@@unique([buyerUserId, listingId])` et `@@index([sellerPhoneNumber])`. L'écriture d'avis vit dans `ReviewsService.submitReview` (`apps/api/src/listings/reviews.service.ts`) exposée par `ReviewsController` (`@Controller('listings')`, `POST :slug/reviews`, `@Inject(ReviewsService)` explicite). Le contrôle propriétaire y est déjà présent : `submitReview` rejette l'auto-avis via `listing.ownerPhoneNumber === session.phoneNumber`.

La projection publique est dans `ProfileService.getPublicSeller` : `prismaService.review?.findMany?.({ include: { buyer: true }, orderBy: { createdAt: 'desc' }, where: { sellerPhoneNumber } })` puis un `.map` qui ne conserve que `buyer.displayName`, `comment`, `createdAt`, `rating`. Le rendu front est `renderReviewCard` dans `App/features/profile/seller-public-screen.mjs` (monogramme acheteur, nom, date, étoiles via `renderRatingStars`, commentaire), appelé par `renderReviewsSection`. L'écran public est servi sans authentification via `GET /sellers/:sellerId` (`SellersController`).

## Recommended Architecture

### 1. Champs de réponse sur `Review` (migration additive)

Ajouter deux colonnes nullables à `model Review` : `sellerReply String?` et `sellerReplyAt DateTime?`. Migration strictement additive sous `apps/api/prisma/migrations/`. Aucune nouvelle table : la réponse est un attribut de l'avis, ce qui garantit nativement l'unicité (une réponse par avis) et la cascade (la réponse disparaît si l'avis est supprimé).

### 2. Endpoint de réponse — propriétaire uniquement

Exposer `POST /reviews/:reviewId/reply` derrière `SessionAuthGuard`, prenant `{ reply }`. Le service (nouveau `ReviewRepliesService` ou méthode dans `ReviewsService`) : charge l'avis par `id` (404 si absent) ; **autorise uniquement le vendeur visé** en vérifiant `review.sellerPhoneNumber === session.phoneNumber` (sinon `ForbiddenException`) — c'est le miroir du contrôle propriétaire déjà utilisé pour l'auto-avis ; nettoie `reply` via `normalizeReviewComment` (réutilisation du validateur existant, mot entier déjà géré) ; puis met à jour `sellerReply` et `sellerReplyAt = now()` sur l'avis. Une réponse vide efface la réponse (`sellerReply = null`). Le contrôleur et le service utilisent l'injection explicite `@Inject(Token)` (convention du repo : `tsx` n'émet pas les métadonnées de type). Le client `App/services/` gagne un `seller-replies-service.mjs` avec `submitSellerReply({ reviewId, reply, session })`.

### 3. Exposer l'`id` et la réponse dans la projection publique

Étendre le `.map` des avis dans `getPublicSeller` pour inclure `id`, `sellerReply` et `sellerReplyAt` dans chaque entrée renvoyée, en plus des champs actuels. L'accès reste défensif (`review?.findMany?.()` déjà en place). Aucune donnée privée supplémentaire n'est exposée (pas de téléphone).

### 4. Affichage de la réponse et formulaire propriétaire

Étendre `renderReviewCard` (`App/features/profile/seller-public-screen.mjs`) pour afficher, sous le commentaire, la réponse du vendeur quand `sellerReply` est présent (libellé « Réponse du vendeur » + texte + date). Quand le viewer est le vendeur lui-même — détecté côté client en comparant la session au vendeur affiché — rendre, pour les avis sans réponse, un formulaire de réponse inline (`data-action="submit-seller-reply"`, `data-review-id`) ; la sécurité réelle reste serveur (section 2). Câbler l'action dans `App/app.js` via `seller-replies-service.mjs`, avec rechargement du profil vendeur après envoi. Le rendu reste léger (pas de dépendance) pour le terrain RDC.
