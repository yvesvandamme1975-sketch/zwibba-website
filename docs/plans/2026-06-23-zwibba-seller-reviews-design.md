# Zwibba Seller Reviews And Reputation Design

**Date:** 2026-06-23

## Goal

Donner à Zwibba une couche de réputation vendeur : un acheteur vérifié peut noter (1-5 étoiles) et commenter une annonce, et la note moyenne agrégée par vendeur s'affiche sur le bloc vendeur du détail annonce et sur le profil vendeur public.

## Problem

La Vague 1 a posé l'identité vendeur réelle (`User.displayName`, profil public `GET /sellers/:sellerId`, bloc `detail.seller` avec `sellerId`) mais aucune réputation : un acheteur n'a aucun moyen de juger la fiabilité d'un vendeur, et le vendeur n'a aucun capital de confiance à montrer. Aucun modèle `Review`/`Rating` n'existe dans `apps/api/prisma/schema.prisma`.

Le socle est intrinsèquement faible : Zwibba n'enregistre aucune transaction. `mark_sold` capture `soldChannel`/`soldAt` mais pas l'identité de l'acheteur, et `ListingLifecycleEvent` ne trace que les actions du vendeur (`actorPhoneNumber`). Le seul lien sur-plateforme entre un acheteur (`User`) et un vendeur (`ownerPhoneNumber`) à propos d'une annonce est un `ChatThread`. La décision produit retenue pour cette vague est **l'avis ouvert** : toute session vérifiée peut laisser un avis, sans exiger de `ChatThread` préalable. Ce choix maximise le volume d'avis mais déplace la charge anti-abus vers des garde-fous structurels (un seul avis par acheteur et par annonce, blocage de l'auto-avis, modération du texte), et impose une honnêteté d'affichage : l'UI ne revendique jamais « achat vérifié » — ce sont des avis déclaratifs.

## Non-Goals

- Pas de gating sur `ChatThread` ni sur une transaction : tout utilisateur vérifié peut noter (décision assumée). La capture acheteur à la vente reste un chantier séparé non couvert ici.
- Pas de revendication « achat vérifié » ni de badge de transaction dans l'UI.
- Pas de réponse du vendeur aux avis, ni de signalement/litige d'avis dans cette vague.
- Pas de note dénormalisée stockée sur `User` : l'agrégat est calculé à la lecture (volume RDC modeste). La dénormalisation est une optimisation ultérieure.
- Pas de modération humaine ni de file de signalement : seul un filtre automatique léger (longueur + blocklist) s'applique au commentaire, sur le modèle de `normalizeDisplayName`.
- Pas de changement du modèle mobile Flutter (`apps/mobile/`) : web `App/` et `apps/api/` uniquement.
- Pas de rate-limit dédié par session/jour dans cette vague : la contrainte d'unicité (un avis par annonce) borne déjà l'abus au nombre d'annonces du vendeur.

## Existing System

Le profil vendeur public est servi par `ProfileService.getPublicSeller(sellerId)` (`apps/api/src/profile/profile.service.ts`), exposé via `SellersController` (`apps/api/src/profile/sellers.controller.ts`, `GET /sellers/:sellerId`, non authentifié). Il renvoie `{ listings, seller: { displayName, id, memberSince } }`, où `listings` est filtré sur `moderationStatus = 'approved'` et joint par `ownerPhoneNumber = user.phoneNumber`. L'écran public correspondant est `App/features/profile/seller-public-screen.mjs`, routé via `#seller/{id}` (parsing dans `App/features/home/buyer-browse-controller.mjs`).

Le bloc vendeur du détail annonce est produit par `buildSellerProfile({ ownerPhoneNumber, prismaService })` (`apps/api/src/listings/listings.service.ts`, appelé une fois à la ligne 275 dans le constructeur du détail) et renvoie `{ name, role, sellerId }`, consommé dans `App/features/listings/listing-detail-screen.mjs`. La résolution est défensive (`prismaService.user?.findUnique?.()`, fallback `Vendeur Zwibba`, `sellerId` nul pour un propriétaire orphelin).

Le modèle `User` (`apps/api/prisma/schema.prisma`) porte `id`, `phoneNumber` (`@unique`), `displayName String?`, `createdAt`, et des relations dont `chatThreadsAsBuyer`. Le modèle `Listing` porte `id`, `ownerPhoneNumber` (indexé), `slug` (`@unique`), `draftId`. La validation de texte public réutilisable existe dans `apps/api/src/common/display-name.ts` (`normalizeDisplayName` : trim, longueur max, blocklist de mots réservés et grossièretés, normalisation diacritique). Un utilitaire de flood control existe (`apps/api/src/auth/otp-rate-limit.ts`) si besoin ultérieur.

## Recommended Architecture

### 1. Modèle `Review` (migration additive)

Ajouter un modèle `Review` dans `apps/api/prisma/schema.prisma` portant : `id`, `listingId` (FK `Listing`, `onDelete: Cascade`), `buyerUserId` (FK `User`, `onDelete: Cascade`), `sellerPhoneNumber` (dénormalisé depuis `listing.ownerPhoneNumber` à la création, pour agréger par vendeur sans jointure), `rating` (`Int`, contraint 1-5 côté service), `comment` (`String?`), `createdAt`, `updatedAt`. Contrainte `@@unique([buyerUserId, listingId])` — un avis par acheteur et par annonce. Index `@@index([sellerPhoneNumber])` pour l'agrégat. Ajouter les relations inverses `reviews Review[]` sur `User` et sur `Listing`. La migration est strictement additive. Parce que la suppression d'annonce dans Zwibba est douce (`lifecycleStatus = 'deleted_by_seller'`, la ligne `Listing` persiste), les avis ne disparaissent pas quand un vendeur retire une annonce — un vendeur ne peut pas effacer ses mauvais avis ainsi.

### 2. Écriture d'un avis — endpoint et garde-fous

Exposer `POST /listings/:slug/reviews` derrière `SessionAuthGuard`, prenant `{ rating, comment? }`. Le service (nouveau `ReviewsService` ou méthode dans `ListingsService`) : résout l'annonce par `slug` ; **rejette l'auto-avis** si `listing.ownerPhoneNumber === session.phoneNumber` (`BadRequestException`) ; valide `rating` ∈ [1,5] ; nettoie `comment` via un nouveau validateur `apps/api/src/common/review-comment.ts` calqué sur `normalizeDisplayName` (longueur max, blocklist) ; puis fait un **upsert** sur la clé unique `(buyerUserId, listingId)` — un nouvel avis ou la mise à jour de l'avis existant de l'acheteur — en fixant `sellerPhoneNumber` depuis l'annonce. Le service client `App/services/` gagne un `reviews-service.mjs` avec `submitReview({ slug, rating, comment, session })`.

### 3. Agrégat de réputation — calcul à la lecture

Ajouter une méthode de service qui calcule, pour un `ownerPhoneNumber` donné, la moyenne et le nombre d'avis via une agrégation Prisma (`review.aggregate` sur `_avg.rating` et `_count`), filtrée sur `sellerPhoneNumber`. L'appel est **défensif** (`prismaService.review?.aggregate?.()` avec fallback `{ ratingAverage: null, ratingCount: 0 }`) — leçon directe de la Vague 1, où un faux Prisma plus étroit dans un test voisin avait fait planter un délégué nouvellement introduit. Zéro avis renvoie une moyenne nulle et un compte à zéro, jamais une erreur.

### 4. Exposition de l'agrégat sur les points d'accroche existants

Étendre `buildSellerProfile` (`listings.service.ts`) pour inclure `ratingAverage` et `ratingCount` dans l'objet `seller` du détail annonce, via l'agrégat de la section 3. Étendre `ProfileService.getPublicSeller` pour ajouter `ratingAverage` et `ratingCount` à l'objet `seller`, et une liste `reviews` (chaque entrée : `rating`, `comment`, `createdAt`, et l'identité publique de l'acheteur — `displayName` ou fallback neutre + monogramme, **jamais le numéro de téléphone**). Les deux réutilisent la même méthode d'agrégat pour rester cohérents.

### 5. Affichage des étoiles et saisie côté acheteur

Créer un utilitaire de rendu d'étoiles `App/utils/rating-stars.mjs` (pur : note moyenne + compte → markup étoiles + libellé `(n avis)` ou `Pas encore d'avis`). L'utiliser dans le bloc `detail.seller` de `listing-detail-screen.mjs`. Sur ce même écran, pour un viewer vérifié **non propriétaire**, rendre un formulaire d'avis (sélecteur d'étoiles 1-5 + commentaire optionnel) avec `data-action="submit-review"` ; le propriétaire ne voit pas de formulaire. Câbler l'action dans `App/app.js` via `reviews-service.mjs`, avec re-render après soumission.

### 6. Liste des avis sur le profil vendeur public

Étendre `App/features/profile/seller-public-screen.mjs` pour afficher, sous l'identité, l'agrégat (étoiles + moyenne + compte via `rating-stars.mjs`) puis la liste des avis (monogramme acheteur, nom public, étoiles, commentaire, date), avec un état vide clair « Pas encore d'avis » quand la liste est vide. Le rendu reste léger (pas de dépendance, dates formatées côté client) pour le terrain RDC. L'affichage n'emploie aucune mention « vérifié » : ce sont des avis déclaratifs.
