# Zwibba Per Listing Share OG Design

**Date:** 2026-05-31

## Goal

Faire en sorte que le partage d'une annonce (WhatsApp, Facebook) affiche une carte riche propre à cette annonce — photo, prix et localité — pour **toute** annonce réelle publiée, et plus seulement la carte de marque générique `og-default.png` posée précédemment.

## Problem

Le partage depuis le success-screen utilise `state.publishedListingUrl`, qui vaut `/App/#listing/<slug>` (cf. `App/app.js` lignes 1602-1604, `buildBuyerListingRoute` renvoie `#listing/<slug>`). Le `#listing/<slug>` est un **fragment d'URL** : il n'est jamais transmis au serveur HTTP. Quand Facebook ou WhatsApp scrape le lien, `server.mjs` ne reçoit que `/App/` et renvoie le shell SPA, dont les balises Open Graph sont fixes (`og-default.png`, titre « Zwibba App »). Aucune information de l'annonce n'atteint le scraper, d'où la carte générique.

Par ailleurs, les seules pages portant des balises OG par annonce sont les pages SEO statiques `/annonce/{slug}/index.html`, générées par `scripts/build.mjs` à partir d'un **jeu de ~13 annonces de démonstration codées en dur** dans `src/site/content.mjs` (importées comme `listings`). Une annonce réelle publiée par un vendeur n'a donc pas de page statique : `buildListingUrl()` (App/app.js l.318) fabrique bien un chemin `/annonce/<slug>/` mais ce fichier n'existe pas dans `dist/`, et `server.mjs` répond 404.

Le serveur `server.mjs` est toutefois un vrai serveur Node (`createServer`), pas un simple CDN : il peut faire un appel réseau au moment de la requête. L'API NestJS expose déjà un endpoint public `GET /listings/:slug` (`ListingsController.getListingDetail`, `listings.controller.ts` l.55-64) qui retourne pour une annonce publiquement visible : `slug`, `title`, `priceAmount`, `priceCurrency`, `primaryImageUrl`, `storyImageUrl`, et les champs de zone. L'URL de base de l'API est déjà connue du build via `ZWIBBA_API_BASE_URL` (défaut `https://api-production-b1b58.up.railway.app`, cf. `scripts/build.mjs` l.32-33). La pièce manquante est uniquement le rendu OG côté serveur web pour les annonces non statiques, et le fait de partager une URL que le serveur reçoit réellement.

## Non-Goals

- Ne pas régénérer ni modifier la pipeline de story image (`apps/api/src/share/`, feature du 2026-05-27). On consomme `storyImageUrl` tel quel.
- Ne pas transformer le site en SSR complet ni introduire de framework. `server.mjs` reste un serveur Node minimal ; on ajoute une seule branche de rendu OG par annonce.
- Ne pas pré-générer une page statique pour chaque annonce réelle au build (le build n'a pas accès à la base ; et une annonce fraîche n'existerait pas encore au moment du build). La résolution se fait à la requête.
- Ne pas exposer de nouvelles données : on ne lit que ce que `GET /listings/:slug` renvoie déjà publiquement. Aucune donnée privée vendeur.
- Ne pas toucher au flux mobile Flutter (`apps/mobile/`). Scope = `App/` + `server.mjs` (+ un helper de rendu OG partagé éventuel).
- Ne pas dépendre d'un cache externe : un échec ou une latence de l'API ne doit jamais casser le partage — repli sur l'OG de marque `og-default.png`.

## Existing System

**Partage / URL côté App** — `App/app.js` : `buildBuyerListingRoute(slug)` (l.338) renvoie `#listing/<slug>` ; à la publication (l.1590-1604) `state.publishedListingUrl` devient `/App/#listing/<slug>`. Le success-screen (`App/features/post/success-screen.mjs`) pose cette URL sur l'ancre WhatsApp, le bouton Facebook (`handleFacebookShare`) et `copy-listing-link`. `buildListingUrl(draft)` (l.318) sait déjà fabriquer `/annonce/<slug>/`. L'`outcome` de publication porte `listingSlug` (cf. `live-publish-flow.mjs` l.150).

**Serveur web** — `server.mjs` : `resolveFile(urlPath)` mappe les chemins vers des fichiers de `dist/`. Pour `/annonce/<slug>/` sans fichier statique correspondant, il renvoie `null` → 404. Aucun appel API, aucune logique OG dynamique aujourd'hui. C'est le point d'extension.

**Pages SEO statiques** — `scripts/build.mjs` : `renderListingDetail(listing)` (~l.740-880) produit `/annonce/<slug>/index.html` avec un bloc OG complet via `renderLayout({ ogImage, ogTitle, ogImageWidth/Height, productPriceAmount, productPriceCurrency, ... })`. La logique exacte : `ogImage = storyImageUrl ?? listingImageAsset`, `ogTitle = "Je vends sur Zwibba ! <titre>"` si story image, dimensions 1080×1920 si story. Cette logique de mapping listing→OG est la référence à réutiliser pour le rendu serveur.

**API** — `GET /listings/:slug` (`listings.controller.ts` l.55) → `listings.service.getListingDetail(slug)` (l.396). Retourne `NotFoundException` si l'annonce n'existe pas ou n'est pas publiquement visible. Champs utiles renvoyés par `toListingDetail` : `slug`, `title`, `priceAmount`, `priceCurrency`, `primaryImageUrl`, `storyImageUrl`, et la zone/ville.

## Recommended Architecture

### 1. Partager une URL que le serveur reçoit

Modifier le calcul de `state.publishedListingUrl` dans `App/app.js` (et la valeur passée au success-screen) pour préférer `/annonce/<slug>/` — un **chemin** que le serveur HTTP reçoit — plutôt que `/App/#listing/<slug>` dont le fragment est perdu. Concrètement : quand `result.outcome.listingSlug` est disponible, `publishedListingUrl = /annonce/<slug>/`. La navigation interne dans l'app (ouvrir l'annonce sans recharger) continue d'utiliser `publishedListingRoute = #listing/<slug>` via le bouton « Voir mon annonce » ; seules les URL **destinées au partage** (WhatsApp, Facebook, copier le lien) basculent sur `/annonce/<slug>/`. Le partage devient donc une vraie URL publique scrappable.

### 2. Rendu OG par annonce dans `server.mjs`

Étendre `resolveFile`/le handler de `server.mjs` : lorsqu'une requête vise `/annonce/<slug>/` et qu'**aucun** fichier statique `dist/annonce/<slug>/index.html` n'existe, au lieu de renvoyer 404, le serveur appelle `GET ${ZWIBBA_API_BASE_URL}/listings/<slug>` (avec un `AbortSignal.timeout` court, ~2,5 s). Sur réponse 200, il rend un document HTML minimal portant les balises Open Graph de l'annonce (voir §3) et un petit script de redirection vers l'app (`location.replace('/App/#listing/<slug>')`) pour qu'un humain qui clique atterrisse dans l'application. Sur 404, erreur réseau ou timeout, il sert un repli : soit la page statique si elle existe, soit un document OG de marque (`og-default.png`) — le partage n'est jamais cassé.

Le serveur lit `ZWIBBA_API_BASE_URL` depuis `process.env` (même variable que le build, défaut `https://api-production-b1b58.up.railway.app`). Cette variable doit être présente sur le service Railway `website` (à vérifier au déploiement ; sinon le défaut codé s'applique).

### 3. Mapping listing → balises OG (cohérent avec le build)

Centraliser la construction des balises OG d'une annonce dans un helper réutilisable (par exemple `shared/listing-og.mjs`, nouveau module ESM importable à la fois par `server.mjs` et, à terme, par `scripts/build.mjs`). À partir d'un objet annonce, le helper produit : `og:image` = `storyImageUrl` si présent sinon `primaryImageUrl` (toujours une image raster) ; `og:image:width/height` = 1080×1920 quand on utilise la story image ; `og:title` = « Je vends sur Zwibba ! <titre> » ; `og:description` incluant le prix formaté et la localité ; `og:url` = l'URL canonique `/annonce/<slug>/` ; `product:price:amount`/`product:price:currency` ; et les équivalents `twitter:*`. Si aucune image d'annonce n'est disponible, repli sur `og-default.png`. Ce helper reproduit la logique déjà présente dans `renderListingDetail` de `build.mjs` afin que page statique et rendu serveur restent identiques.

### 4. Stratégie de test

`server.mjs` n'a pas de suite dédiée aujourd'hui ; `tests/build.test.mjs` lance un serveur et fait des `fetch` réels (pattern réutilisable). On ajoute : (a) un test du helper `shared/listing-og.mjs` (entrée annonce avec/ sans `storyImageUrl` → balises attendues, image raster jamais SVG, prix et localité présents dans la description) ; (b) un test serveur qui simule `GET /annonce/<slug>/` pour un slug **sans** page statique, avec un `fetch` API mocké renvoyant une annonce, et asserte que le HTML rendu contient l'`og:image` = `storyImageUrl` et le prix/localité — plus un cas API-404/timeout qui asserte le repli `og-default.png` sans planter. Côté App, étendre `tests/success-screen.test.mjs` ou la suite app pour vérifier que l'URL de partage est bien `/annonce/<slug>/` et non `/App/#listing/...`.
