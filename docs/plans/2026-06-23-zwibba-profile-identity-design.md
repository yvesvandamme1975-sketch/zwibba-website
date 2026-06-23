# Zwibba Profile Identity And Public Seller Profile Design

**Date:** 2026-06-23

## Goal

Doter Zwibba d'une vraie identité vendeur — nom d'affichage éditable et identité visuelle par monogramme d'initiales, ancienneté visible — et exposer un profil vendeur public qu'un acheteur ouvre depuis une annonce, tout en supprimant la donnée vendeur fabriquée aujourd'hui servie à l'acheteur.

## Problem

Aujourd'hui `User` (dans `apps/api/prisma/schema.prisma`) ne porte que `phoneNumber`, `area`, `createdAt`, `updatedAt`. L'écran `App/features/profile/profile-screen.mjs` est de fait un tableau de bord vendeur (zone + gestion des annonces par cycle de vie) : il n'expose aucune identité, et la session vérifiée n'affiche que le numéro de téléphone. L'API `apps/api/src/profile/profile.controller.ts` n'expose que `GET /profile` et `POST /profile {area}` ; `apps/api/src/profile/profile.service.ts` ne renvoie que `{ area, phoneNumber }`.

Côté acheteur, le bloc vendeur du `App/features/listings/listing-detail-screen.mjs` (`detail.seller`) est alimenté par `buildSellerProfile` dans `apps/api/src/listings/listings.service.ts`, qui **fabrique** le nom (`Particulier 1234`, dérivé des 4 derniers chiffres du téléphone) et **code en dur** une cadence de réponse (`Répond en moyenne en 9 min` / `22 min`) sans aucune donnée réelle derrière. C'est un passif de crédibilité : la donnée est fausse et identique pour tout le monde.

Enfin, `App/services/auth-service.mjs` expose une méthode `clearSession()` (ligne 64) qui n'est câblée nulle part dans l'écran profil : l'utilisateur ne peut pas se déconnecter, et un acheteur ne peut pas naviguer vers le vendeur depuis une annonce — `detail.seller` n'est pas cliquable et aucune route vendeur n'existe dans `parseAppRoute` (`App/features/home/buyer-browse-controller.mjs`, ligne 47).

## Non-Goals

- Pas de système de notes/avis ni d'agrégat de réputation — c'est une vague ultérieure dédiée.
- Pas de calcul d'une cadence de réponse réelle (médiane de délai de première réponse) : la donnée fabriquée est **retirée**, pas recalculée, dans ce passage.
- Pas de vérification d'identité forte (KYC, pièce d'identité) ni de badge « vendeur pro » basé sur autre chose que la catégorie existante.
- Pas d'upload de photo d'avatar : l'identité visuelle est une pastille d'initiales (monogramme) dérivée du nom, côté client ; l'upload photo modéré (et donc la modération d'image et la colonne `avatarUrl`) est une vague ultérieure. Ce choix élimine la surface de modération d'image publique de ce passage.
- Pas de multi-langue (Lingala, Swahili) : l'écran reste FR.
- Pas de changement de numéro de téléphone ni de suppression de compte / export RGPD dans ce passage.
- Pas de modification du modèle mobile Flutter (`apps/mobile/`) — web `App/` et `apps/api/` uniquement.
- Pas de confirmation ajoutée sur les actions de cycle de vie : `App/app.js` confirme déjà `delete` via `promptForLifecycleReason` + `window.confirm`.

## Existing System

Le profil propriétaire vit dans `App/features/profile/profile-screen.mjs` : `renderProfileScreen` gère un état verrouillé (sans session) et un état vérifié affichant `profilePhoneNumber`, la carte « Ma zone » (combobox ville avec autocomplétion et suggestion de ville manquante), les compteurs de modération, et les sections de cycle de vie. Le service client `App/services/profile-service.mjs` expose `fetchProfile` (`GET /profile`), `saveProfile` (`POST /profile {area}`), `listCities`, `suggestCity`.

Côté API, `apps/api/src/profile/profile.controller.ts` déclare `GET /profile` et `POST /profile`, tous deux derrière `SessionAuthGuard`, et délègue à `ProfileService` (`apps/api/src/profile/profile.service.ts`) : `getProfile` charge l'utilisateur par `phoneNumber` et renvoie `{ area, phoneNumber }` ; `updateProfile` valide la zone contre `LocationOption`. Le module est `apps/api/src/profile/profile.module.ts`.

Le bloc vendeur côté acheteur est produit par `buildSellerProfile` dans `apps/api/src/listings/listings.service.ts` (≈ ligne 90) et consommé dans `App/features/listings/listing-detail-screen.mjs` (≈ ligne 435) sous `detail.seller.name` / `.role` / `.responseTime`. Le contrôleur `apps/api/src/listings/listings.controller.ts` expose `GET /listings`, `GET /listings/mine`, `GET /listings/:slug`, `POST /listings/:listingId/lifecycle`, `POST /listings/:slug/share`. Les annonces sont liées à leur propriétaire par `Listing.ownerPhoneNumber` (pas de FK directe vers `User.id`).

Le pipeline média est dans `apps/api/src/media/` : `media.service.ts > createUploadSlot` renvoie un upload pré-signé avec `uploadUrl` et `publicUrl` (stockage `r2-storage.service.ts`). C'est le mécanisme à réutiliser pour l'avatar : le client demande un slot, PUT l'image, puis persiste l'URL publique retournée.

Le runtime `App/app.js` (≈ 2350 lignes) orchestre le rendu par route via `parseAppRoute` (défini dans `App/features/home/buyer-browse-controller.mjs`), rend le profil dans le `case 'profile'` (≈ ligne 983) et applique les actions de cycle de vie via `sellerListingsService.applyLifecycleAction`. La déconnexion (`clearSession` dans `App/services/auth-service.mjs`) n'y est pas branchée.

## Recommended Architecture

### 1. Migration Prisma additive sur `User`

Ajouter une colonne nullable à `model User` dans `apps/api/prisma/schema.prisma` : `displayName String?`. `phoneNumber` reste l'ancre d'identité et la clé de jointure avec `Listing.ownerPhoneNumber`. La migration est créée sous `apps/api/prisma/migrations/` et est strictement additive (aucune colonne supprimée ou renommée, aucune valeur par défaut destructive), conforme à la règle du repo (`prisma migrate deploy` au boot, jamais de SQL à la main). `createdAt` existe déjà et sert de source pour « membre depuis » sans changement de schéma. La colonne `avatarUrl` n'est pas ajoutée dans ce passage (avatar = monogramme client, cf. Non-Goals).

### 2. API profil propriétaire — lecture et écriture de l'identité

Étendre `ProfileService.getProfile` pour renvoyer, en plus de `area` et `phoneNumber`, les champs `displayName` et `memberSince` (dérivé de `user.createdAt`, renvoyé brut/ISO pour formatage côté client). Étendre l'écriture : conserver `POST /profile` pour la zone et ajouter un point dédié `POST /profile/identity` prenant `displayName`. La validation est explicite et centralisée dans un validateur réutilisable sous `apps/api/src/common/` : longueur bornée, nettoyage des espaces, rejet d'une blocklist de grossièretés et de mots réservés (`zwibba`, `officiel`, `admin`, `support`) pour limiter l'usurpation — sans contrainte d'unicité. Le service client `App/services/profile-service.mjs` gagne une méthode `saveIdentity`.

### 3. Suppression de la donnée vendeur fabriquée

Réécrire `buildSellerProfile` dans `apps/api/src/listings/listings.service.ts` pour qu'il consomme l'identité réelle du propriétaire quand elle existe : résoudre l'utilisateur par `ownerPhoneNumber`, et utiliser `displayName` comme nom affiché. En l'absence de `displayName`, retomber sur un libellé neutre non trompeur (par exemple « Vendeur Zwibba ») plutôt que sur un faux nom dérivé du téléphone. La cadence de réponse codée en dur (`responseTime`) est **retirée** du contrat `detail.seller` ; le `role` dérivé de la catégorie peut être conservé tel quel ou neutralisé, à trancher en implémentation. `App/features/listings/listing-detail-screen.mjs` est ajusté pour ne plus afficher la ligne `responseTime`.

### 4. Profil vendeur public — endpoint et résolution sans exposer le téléphone

Exposer un point public non authentifié qui retourne, pour un vendeur donné, son identité publique (`displayName` ou fallback neutre, `memberSince`) et ses annonces actives. La clé d'URL est `User.id` (cuid stable), jamais le numéro de téléphone : le point résout l'utilisateur par id, puis charge ses annonces via `ownerPhoneNumber` filtrées sur `lifecycleStatus = 'active'` et `moderationStatus = 'approved'`. Ce point est ajouté dans le module profil (par exemple `GET /sellers/:sellerId`) en réutilisant `ProfileService` et la logique de listing existante. Le contrat exclut toute donnée privée (téléphone, transactions, brouillons).

### 5. Écran vendeur public et navigation côté acheteur

Ajouter un type de route vendeur dans `parseAppRoute` (`App/features/home/buyer-browse-controller.mjs`), par exemple `#seller/{sellerId}`. Rendre le bloc `detail.seller` du `listing-detail-screen.mjs` cliquable vers cette route quand un `sellerId` est disponible dans le contrat de détail. Créer un écran de rendu vendeur public (nouveau module sous `App/features/profile/`) qui affiche le monogramme d'initiales, le nom, « membre depuis » et la grille des annonces actives du vendeur (avec état vide propre si zéro annonce), en réutilisant les utilitaires de rendu de carte existants. La clé de dédup de rendu (`getRenderableRouteKey`) doit être étendue pour la route vendeur, sinon naviguer d'un vendeur à l'autre ne re-render pas. Câbler le nouveau `case` correspondant dans `App/app.js` avec le chargement des données via le service profil/listings.

### 6. Identité éditable et déconnexion dans l'écran propriétaire

Dans `App/features/profile/profile-screen.mjs`, ajouter au-dessus ou à côté de la carte « Ma zone » une carte d'identité : champ nom d'affichage, pastille d'initiales (monogramme) dérivée du nom côté client, et la mention « Membre depuis ». Ajouter un bouton **Déconnexion**. Son handler dans `App/app.js` ne se limite pas à `clearSession()` (qui ne vide que la session persistée) : il doit aussi réinitialiser l'état en mémoire (`state.session` et les caches des contrôleurs) avant de rediriger vers `#auth-welcome`, sinon l'UI reste en mode authentifié avec des données périmées. L'état verrouillé existant reste inchangé. Le rendu reste léger (pas de dépendance lourde, images en `loading="lazy"`) pour le terrain RDC.
