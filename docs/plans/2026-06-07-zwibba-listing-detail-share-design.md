# Zwibba Listing Detail Share Design

**Date:** 2026-06-07

## Goal

Permettre à tout visiteur (acheteur ou vendeur) de partager une annonce depuis l'écran de détail de la PWA, en utilisant le système de partage natif de l'OS (iOS Share Sheet / Android Share Intent) avec une URL qui produit une carte social riche (image, titre, prix) sur WhatsApp, Facebook, TikTok et Instagram, et en comptabilisant chaque partage pour le vendeur.

## Problem

Le partage social existe aujourd'hui uniquement sur le success-screen après publication (plans du 2026-05-27 et 2026-05-31). Un acheteur qui consulte une annonce n'a aucun moyen de la partager. Un vendeur qui veut repartager une annonce publiée précédemment doit retourner au flux de publication, ce qui est un cul-de-sac UX.

Par ailleurs, le success-screen peut tomber sur le fallback de `buildListingUrl(draft)` (App/app.js l.318) quand `result.outcome.listingSlug` est absent, ce qui génère un slug fictif comme `annonce-zwibba` au lieu du slug réel de l'API. Ce slug fictif ne résout rien côté serveur : `server.mjs` fetch l'API avec `annonce-zwibba`, obtient une 404, et sert un OG générique. Le visiteur qui clique le lien depuis WhatsApp est redirigé vers `/App/#listing/annonce-zwibba`, le contrôleur `loadBuyerListing("annonce-zwibba")` échoue, et l'écran reste bloqué sur "Chargement de l'annonce" comme confirmé par la capture du 2026-06-07.
Le listing detail screen (`App/features/listings/listing-detail-screen.mjs`) a accès à `detail.slug` — le vrai slug résolu par l'API. C'est le point d'ancrage fiable pour le partage.

Enfin, le format 9:16 de l'image story (déjà généré par `apps/api/src/share/` au moment de la publication) n'est pas réutilisé au moment du partage depuis le detail screen. Le partage natif via `shareStoryImageNative()` (App/features/post/post-flow-controller.mjs l.245-278) sait déjà consommer `storyImageUrl` et l'envoyer via `navigator.share({ files: [...] })`, mais cette fonction n'est appelée que depuis le post flow, pas depuis le detail screen.

## Non-Goals

- Ne pas modifier la génération de l'image story 9:16 côté API (`apps/api/src/share/`). On consomme `storyImageUrl` tel quel. Si l'annonce n'a pas encore de story image, le partage se fait en mode lien seul (sans fichier image).
- Ne pas toucher au success-screen de publication (`App/features/post/success-screen.mjs`). Les boutons de partage y restent indépendants.
- Ne pas ajouter de boutons de partage spécifiques par plateforme (bouton WhatsApp, bouton Facebook). On utilise exclusivement `navigator.share()` qui délègue au sélecteur natif de l'OS. Fallback : copie du lien dans le presse-papiers.
- Ne pas introduire de génération d'image story côté client (canvas). Scope serveur-side uniquement via l'endpoint existant ou une future route `/annonce/{slug}/story.png`.
- Ne pas toucher au flux mobile Flutter (`apps/mobile/`).
- Ne pas lever l'infrastructure de server-side rendering dynamique déjà en place dans `server.mjs` (route `/annonce/{slug}`, `fetchListing()`, `buildListingOgTags()`). On s'appuie dessus.
## Existing System

**Listing detail screen** — `App/features/listings/listing-detail-screen.mjs` : fonction `renderListingDetailScreen({ detail, ... })`. Le `detail` object contient `slug`, `title`, `id`, `images`, `primaryImageUrl`, `seller`, `contactActions`, et le champ `viewerRole` (`'owner'` vs autre). Pour l'owner, `renderOwnerLifecycleCard(detail)` affiche la carte "Gérer mon annonce" avec le bouton "Modifier" (construit par `buildEditListingButton(detail)`) et les actions de lifecycle (pause, resume, mark_sold, relist, restore, delete). Pour les non-owners, les actions sont "Envoyer un message" et "Appeler". Aucun bouton partage n'existe.

**Partage natif existant** — `App/features/post/post-flow-controller.mjs` : `buildStoryShareText({ listingUrl, title })` retourne `"Je vends sur Zwibba ! {title} — {url}"`. `canShareStoryImage()` teste si `navigator.canShare({ files: [pngFile] })` est supporté. `shareStoryImageNative({ imageUrl, storyImageUrl, listingUrl, title })` fetch l'image story, la wrappe dans un `File`, et appelle `navigator.share({ files, text, title, url })`. Ces trois fonctions sont exportées et réutilisables depuis n'importe quel module.

**Serveur OG dynamique** — `server.mjs` : la route `/annonce/{slug}` (l.155-175) extrait le slug, appelle `fetchListing(slug)` vers l'API NestJS (`GET /listings/{slug}`), et rend une page HTML avec les OG tags (via `buildListingOgTags()` de `shared/listing-og.mjs`) puis un redirect JS vers `/App/#listing/{slug}`. En cas d'échec API, un `buildFallbackListing(slug)` fournit des OG génériques. Cette infrastructure fonctionne correctement quand le slug est réel.
**API listings** — `apps/api/src/listings/` : `GET /listings/:slug` retourne le détail public d'une annonce incluant `slug`, `title`, `priceAmount`, `priceCurrency`, `locationLabel`, `primaryImageUrl`, `storyImageUrl`. Pas d'authentification requise pour les annonces publiées. Pas de compteur de partage existant.

**Detail object côté client** — Le `detail` reçu par `listing-detail-screen.mjs` est le retour direct de `listingsService.getListingDetail(slug)` (App/services/listings-service.mjs). Il contient `detail.slug` (le vrai slug API), `detail.id`, et potentiellement un champ `storyImageUrl` si l'image story a été générée à la publication.

**Buyer browse controller** — `App/features/home/buyer-browse-controller.mjs` : `loadListing(slug, { session })` peuple `state.detail` et `state.detailStatus`. Le `slug` provient de `parseAppRoute(hash)` qui extrait de `#listing/{slug}`.

## Recommended Architecture

### 1. Bouton Partager sur le detail screen (owner + acheteur)

Ajouter une fonction `buildShareButton(detail)` dans `listing-detail-screen.mjs` qui rend un bouton avec `data-action="share-listing"`, `data-share-slug` (le vrai `detail.slug`), `data-share-title` (le titre), et `data-share-url` (l'URL canonique `/annonce/{slug}/`). Pour l'owner, ce bouton s'affiche dans `renderOwnerLifecycleCard()` à côté du bouton "Modifier", dans un conteneur flex horizontal. Pour un non-owner, le bouton est rendu comme une icône compacte à côté des actions "Envoyer un message" / "Appeler". Le label textuel est "Partager" pour l'owner (bouton plein, accent) et une icône seule pour l'acheteur (bouton secondaire discret).
### 2. Handler de partage dans app.js

Dans `App/app.js`, intercepter `data-action="share-listing"` dans le délégateur de clics. Le handler extrait `slug`, `title` et `shareUrl` des data-attributes, puis tente `navigator.share({ title: "Je vends sur Zwibba !", text: buildStoryShareText({ listingUrl, title }), url: shareUrl })`. Si `detail.storyImageUrl` existe et que `canShareStoryImage()` retourne true, utiliser `shareStoryImageNative()` pour partager l'image story en fichier joint (comportement déjà implémenté dans post-flow-controller.mjs, réutilisation directe). Fallback en cas d'absence de `navigator.share` : copier l'URL dans le presse-papiers via `navigator.clipboard.writeText()` et afficher un feedback textuel "Lien copié" sur le bouton pendant 2 secondes.

### 3. URL de partage fiable

L'URL de partage est toujours `${window.location.origin}/annonce/${detail.slug}/`. Ce chemin est servi dynamiquement par `server.mjs` qui fetch les OG tags depuis l'API et redirige vers `/App/#listing/{slug}`. Le `detail.slug` est le vrai slug retourné par l'API, pas un slug fabriqué côté client. Ceci élimine le bug `annonce-zwibba` : le detail screen n'utilise jamais `buildListingUrl(draft)`.

### 4. Compteur de partage côté API

Ajouter un endpoint léger `POST /listings/:slug/share` dans le module listings de l'API NestJS. Ce endpoint incrémente un compteur `shareCount` sur le modèle Listing (nouvelle colonne Prisma, défaut 0). Pas d'authentification requise (le compteur est anonyme). Le handler dans app.js appelle ce endpoint en fire-and-forget après un partage réussi (`fetch(..., { method: 'POST' }).catch(() => {})` — l'échec du compteur ne doit jamais bloquer le partage). Le compteur est exposé dans `GET /listings/:slug` et peut être affiché ultérieurement dans le detail screen ou le dashboard vendeur.

### 5. Texte de partage et OG harmonisés

Le texte pré-rempli du `navigator.share()` est "Je vends sur Zwibba ! {title} — {url}", identique à `buildStoryShareText()` déjà existant. Les OG tags servis par `server.mjs` portent déjà `og:title = "Je vends sur Zwibba ! {title}"` quand `storyImageUrl` existe (vérifié dans `shared/listing-og.mjs` l.37). L'expérience est donc cohérente : le texte dans WhatsApp et la carte de preview Facebook affichent le même message.