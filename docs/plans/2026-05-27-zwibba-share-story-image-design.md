# Zwibba Share Story Image Design

**Date:** 2026-05-27

## Goal

Permettre au vendeur Zwibba de partager son annonce fraîchement approuvée sous forme d'une image Story 1080×1920 brandée (logo Zwibba avec Z capital, photo produit, prix, zone géographique, phrase « Je vends sur »), aussi bien en chat WhatsApp/Facebook (où la même image servira de `og:image`) qu'en story native via Web Share API mobile. L'image est générée server-side avec `sharp`+composite, stockée sur Cloudflare R2, et bakée automatiquement au moment de l'approbation du listing par modération.

## Problem

Aujourd'hui le success-screen post-publication propose un seul bouton « Partager sur WhatsApp » qui ouvre `https://wa.me/?text=<title> est maintenant en ligne sur Zwibba: <listingUrl>`. Trois problèmes mesurables :

- Le `listingUrl` partagé pointe vers la PWA hash-route (`#listing/...`) ou vers la page SEO `/annonce/{slug}/` selon le mode de publication, et même quand c'est la bonne URL, les `og:image` actuels (cf. `dist/annonce/canape-3-places-style-contemporain/index.html`) pointent vers la photo brute du produit — image carrée non brandée. WhatsApp affiche donc une carte minimaliste, sans logo Zwibba ni mention du prix, peu engageante en conversation.
- Il n'existe aucun chemin de partage en **story** (WhatsApp Status, Instagram Stories, Facebook Stories) : Meta n'expose aucune URL scheme publique pour ouvrir directement la composition d'une story, et la seule voie viable côté browser est `navigator.share({files: [imageBlob], ...})` qui requiert une image déjà construite côté client.
- Il n'existe **aucun bouton Facebook ni Instagram** sur le success-screen, alors que `facebook.com/sharer/sharer.php?u=<url>` existe et marche très bien pour le partage chat/wall Facebook si l'OG est correct.

Le visuel cible a été figé avec Yves le 2026-05-27 (direction C raffinée) : fond sombre `#0f160f`, header centré « Je vends sur » suivi du logo Zwibba (Z capital, point vert sur le `i`), photo carrée `1:1` au milieu, bandeau vert `#39a935` en bas portant titre + zone géographique avec icône pin + prix gros.

La pipeline existante facilite le hook : `apps/api/src/moderation/moderation.service.ts` exécute déjà une mutation Prisma qui set `moderationStatus: 'approved'` + `publishedAt: new Date()` sur le `Listing`. C'est l'instant où la story image doit être bakée. Le storage R2 est déjà câblé via `apps/api/src/media/r2-storage.service.ts` (`PutObjectCommand` + `publicBaseUrl`). `sharp` n'est pas encore dans les dépendances de `apps/api/` mais c'est le toolkit standard de génération d'image PNG côté Node.

## Non-Goals

- Ne pas intégrer l'Instagram Stories Sharing SDK officiel de Meta (`instagram://story-camera` deep link avec sticker). Trop lourd pour un internal beta : nécessite un app ID Facebook, déclarations privacy, review Meta, et l'image doit déjà être sur le device. Le passage par Web Share API mobile couvre 80% du cas sans la complexité.
- Ne pas générer plusieurs variantes (1:1 feed, 9:16 story, 1.91:1 OG header) dans cette première passe. Une seule image Story 1080×1920 sert à tout : og:image (les clients chat acceptent un ratio non-standard), Web Share API, download manuel.
- Ne pas internationaliser l'overlay. Texte fixe en français (« Je vends sur ») — Zwibba est mono-langue par construction.
- Ne pas régénérer rétroactivement les story images pour les listings déjà approuvés avant le déploiement. Les anciens listings garderont un partage non-brandé ; un futur backfill peut être scopé séparément si besoin.
- Ne pas exposer un endpoint dynamique `GET /api/listings/:id/story-image.png` qui régénère à la volée. Le bake à la publication suffit ; en cas d'échec de génération, le seller continue à pouvoir partager (fallback texte uniquement).
- Ne pas modifier le flux mobile Flutter (`apps/mobile/`). Aucune surface partage n'y existe encore — le scope reste PWA + API.
- Ne pas inclure un QR code ou un short link dans l'image. La phrase « Je vends sur Zwibba » sert d'identifiant de marque, suffisant à ce stade.

## Existing System

**Pipeline d'approbation** — `apps/api/src/moderation/moderation.service.ts` expose `approveListing(listingId)` (ou méthode équivalente — à confirmer en lecture exacte à l'écriture du code) qui exécute `prisma.listing.update({ data: { moderationStatus: 'approved', publishedAt: new Date() } })` puis upserte un `ModerationDecision`. Aucun hook post-approval n'existe aujourd'hui.

**Storage R2** — `apps/api/src/media/r2-storage.service.ts` instancie un `S3Client` AWS SDK pointé sur Cloudflare R2 (`endpoint`, `accessKeyId`, `secretAccessKey`, `bucket`, `publicBaseUrl` depuis `env.r2`). La méthode actuelle `createPresignedUpload` génère des URLs présignées pour les uploads sellers. Il faut une nouvelle méthode `putBuffer({ objectKey, contentType, body })` qui upload directement un buffer (la story image PNG générée par l'API, pas par le client).

**Schéma Prisma** — `apps/api/prisma/schema.prisma` model `Listing` n'a pas de champ `storyImageUrl`. Une nouvelle migration ajoute `storyImageUrl String?` nullable. Les listings antérieurs restent à `null`, ce qui déclenche le fallback côté UI (texte sans image story).

**Pages SEO statiques** — `dist/annonce/{slug}/index.html` sont générées par `scripts/build.mjs` (à confirmer à l'écriture, lecture nécessaire). Les meta `og:image`, `og:title`, `og:description` y sont déjà posés mais `og:image` pointe vers la photo brute. La pipeline de build doit lire `Listing.storyImageUrl` (via un endpoint API ou un seed JSON) et override `og:image` quand cette URL est présente.

**Success screen** — `App/features/post/success-screen.mjs` : fonction `buildWhatsAppShareUrl` construit `https://wa.me/?text=...`, le bouton « Partager sur WhatsApp » est un `<a target="_blank">` simple. Aucune logique JS de Web Share API. Le composant reçoit `outcome` (avec status `approved` / `pending_manual_review` / `blocked_needs_fix`) et n'affiche les share actions que pour `approved`. C'est là qu'on étend.

**Logo source** — `dist/assets/brand/logo-zwibba.svg` (viewBox `0 0 841.89 595.28`) contient le logo complet « Zwibba » (Z capital) avec un `i` vert (`#39a935`) et le reste en blanc. Pour l'overlay story, on extrait ou simplifie ce SVG dans un module `apps/api/src/share/zwibba-logo.svg.ts` qui exporte une string SVG ou un buffer PNG préconverti — le choix dépend du chemin Sharp le plus économe (composite SVG → PNG par Sharp est natif).

## Recommended Architecture

### 1. Schéma de stockage et identifiant d'objet R2

Chaque listing approuvé reçoit une story image dont l'objectKey R2 suit le pattern `listings/{listingId}/story.png`. Utiliser `listingId` plutôt que `slug` parce que le slug peut théoriquement changer si Yves ajoute un éditeur de slug plus tard, alors que l'id est immuable. L'URL publique résultante est `${env.r2.publicBaseUrl}/listings/{listingId}/story.png` et est persistée dans `Listing.storyImageUrl` après upload réussi.

### 2. Migration Prisma `Listing.storyImageUrl`

Ajouter `storyImageUrl String?` au model `Listing` dans `apps/api/prisma/schema.prisma`. Générer la migration via `prisma migrate dev --name listing_story_image_url` (ou équivalent CI). Le champ reste `null` par défaut, ce qui code « pas de story image disponible » et déclenche le fallback texte côté UI.

### 3. Service `StoryImageService` côté API

Créer `apps/api/src/share/story-image.service.ts` qui expose une méthode `generateAndStoreForListing(listingId): Promise<{ storyImageUrl: string }>` orchestrant :

1. Charger le listing + sa photo principale via Prisma (réutiliser le pattern `resolveListingDraft` déjà présent dans `listings.service.ts`).
2. Télécharger le buffer de la photo principale (HTTP GET sur `primaryImageUrl`).
3. Construire l'image story via `composeStoryImage(...)` (helper séparé, voir section 4).
4. Upload le PNG résultant sur R2 via `R2StorageService.putBuffer({ objectKey: 'listings/{id}/story.png', contentType: 'image/png', body: pngBuffer })`.
5. Persister `Listing.storyImageUrl` en base.
6. Retourner l'URL publique.

Gestion d'erreur : si une étape échoue (download photo failed, composite failed, R2 put failed), le service log un warning structuré et **ne propage pas l'erreur** vers le caller — la publication ne doit jamais être bloquée par un raté de story image.

### 4. Helper de composition `composeStoryImage`

Fonction pure dans `apps/api/src/share/compose-story-image.ts` qui prend en entrée `{ photoBuffer, title, zoneLabel, priceLabel }` et retourne un `Buffer` PNG 1080×1920. Pipeline `sharp` :

1. Créer un canvas 1080×1920 fond `#0f160f` (Sharp `create` + raw fill).
2. Composite la photo produit : `sharp(photoBuffer).resize(972, 972, { fit: 'cover' }).png()`. Placement à `top: 240, left: 54` (centré horizontalement).
3. Composite le SVG header construit dynamiquement : `<svg>` contenant le texte « Je vends sur » en `#9aff8f` à gauche, le logo Zwibba (référence au SVG simplifié inline) à droite, alignés horizontalement et centrés. Placement à `top: 80`.
4. Composite le SVG footer (bandeau vert) : rectangle vert `#39a935` plein du bas sur ~280px de haut, surplus avec texte titre (blanc rgba 0.92), icône map-pin + zone (blanc rgba 0.78), prix gros (blanc plein, font-weight 500). Placement à `top: 1640`.
5. `.png().toBuffer()` pour finaliser.

Les fonts à utiliser dans les SVG composites : `Manrope` et `Sora` (Google Fonts, déjà chargées côté PWA — il faut les rendre dispo à `sharp` via `@fonts/manrope.ttf` packagés dans `apps/api/assets/` ou via un fallback `sans-serif`). Décision : packager les TTF dans le repo plutôt que de dépendre d'un download Google à chaque build.

### 5. Module logo `zwibba-logo.svg.ts`

Extraire le logo depuis `dist/assets/brand/logo-zwibba.svg` (parser le SVG, ne garder que les `<path>` du mot « Zwibba » et son point vert), le simplifier pour ne garder que le tracé sur fond transparent, et l'inliner comme `export const ZWIBBA_LOGO_SVG = '<svg ...>...</svg>'` dans `apps/api/src/share/zwibba-logo.svg.ts`. La couleur du `i` (`.st1` `#39a935`) reste préservée, le reste (`.st0`) passe en `#ffffff` puisqu'on rend sur fond sombre.

### 6. Hook dans l'approbation (fire-and-forget)

Modifier `moderation.service.ts` `approveListing` pour invoquer `void storyImageService.generateAndStoreForListing(listingId).catch(...)` **après** le `prisma.listing.update({...approved})`. L'appel est **fire-and-forget** : la promesse n'est pas awaitée, son `.catch` log les erreurs sans propager. Le retour de `approveListing` reste instantané — l'admin ne subit pas la latence de download photo + composite + R2 put (qui peut atteindre 3-5 secondes selon la taille de la photo source).

Conséquence assumée : pendant les ~3-5 secondes qui suivent l'approbation, `Listing.storyImageUrl` est `null` côté API. Si le seller affiche son success-screen immédiatement (cas le plus rare en pratique vu que c'est l'admin qui approuve, pas le seller), il verra le fallback texte sans story image. Le seller pourra recharger plus tard pour récupérer l'URL.

Cas de la **re-approbation** (un listing déjà approved est ré-approved après modification) : on régénère l'image, on overwrite l'object R2 (même path), on update `storyImageUrl` qui restera la même URL. CDN cache invalidation sera nécessaire si on met du Cache-Control long ; pour ce passage, on accepte le délai cache (URL stable, payload différent).

### 7. UI success-screen : Web Share API + boutons spécifiques

Réécrire `App/features/post/success-screen.mjs`. La logique de share devient :

- Si `storyImageUrl` est présent dans le payload du listing reçu par le client : fetch le blob de l'image dans le browser au mount du component, le stocker en state.
- Détecter le support `navigator.share` + `navigator.canShare({files: [...]})` (mobile Chrome Android et Safari iOS le supportent en 2026).
- Bouton primaire **« Partager mon annonce »** :
  - Mobile + canShare : invoque `navigator.share({title: 'Je vends sur Zwibba !', text: '${title} — ${priceLabel}', url: listingUrl, files: [imageBlob]})`. Le user choisit lui-même WhatsApp Status / Instagram / Direct / etc.
  - Desktop ou Web Share non disponible : déplie un menu avec 4 boutons spécifiques : WhatsApp chat (`wa.me`), Facebook (`facebook.com/sharer`), Télécharger l'image story (download direct), Copier le lien.
- Garder les boutons existants « Copier le lien », « Voir mon annonce », « Booster cette annonce » comme aujourd'hui.

### 8. OG meta override sur les pages SEO statiques

`scripts/build.mjs` (lecture nécessaire à l'écriture pour le path exact des templates) génère les pages `/annonce/{slug}/index.html` à partir d'un snapshot de listings. Modifier le template pour que `<meta property="og:image">` utilise `storyImageUrl` si présent, fallback vers `primaryImageUrl` sinon. Ajouter aussi `<meta property="og:image:width" content="1080">` et `og:image:height` `1920` quand on utilise la story image, et `<meta property="og:title" content="Je vends sur Zwibba ! ${title}">` qui inclut la phrase de marque dans le titre OG aussi.

Ajouter en plus `<meta property="product:price:amount">` et `product:price:currency` (extension Facebook reconnue, affichée dans la carte Messenger Marketplace si applicable).

### 9. Stratégie de test

Trois couches :

- **Compose pure** : un test sur `composeStoryImage` qui prend un photoBuffer fixture (un PNG fixé en `apps/api/test/fixtures/`), assert la sortie est un buffer PNG dont les dimensions sont 1080×1920 (via `sharp(buf).metadata()`). Pas d'assertion pixel-perfect — trop fragile.
- **Hook moderation** : un test e2e ou unitaire sur `approveListing` avec un mock de `storyImageService`, asserte que la méthode est invoquée avec le bon `listingId`. Un autre test avec un mock qui throw, assert que `approveListing` retourne quand même OK et logge l'erreur.
- **UI success-screen** : tests `node --test` sur `tests/success-screen.test.mjs` (ou équivalent) couvrant le rendu en mode `storyImageUrl present` vs `absent`, et la présence des boutons attendus (Web Share fallback affiché si navigator.share absent — testé en passant un mock dans le DOM stub).

Pas de test e2e Playwright sur le Web Share API — c'est trop spécifique navigator-API et le mocking est lourd. Vérification visuelle via prod après deploy.

### 10. Fonts packagées et chargées via fontconfig

`sharp` rend du texte SVG via `librsvg` qui s'appuie sur les fonts installées dans le système (chemin `fontconfig`). Packager les TTF Manrope (regular 400 + medium 500) et Sora (medium 500 + bold 700) dans `apps/api/assets/fonts/` (~400 KB total) et créer un fichier `apps/api/assets/fonts/fonts.conf` minimal qui pointe `fontconfig` vers ce dossier. Au boot de `StoryImageService`, exporter `FONTCONFIG_FILE=${ASSETS}/fonts/fonts.conf` dans `process.env` si non défini, ce qui force `librsvg` (via `sharp`) à utiliser ce config plutôt que celui du système hôte. Ce pattern fonctionne sur Railway (Linux Alpine ou Debian selon le builder) et localement sur macOS sans modifications. Les fonts sont licenciées SIL Open Font License (Manrope) et Open Font License (Sora) — embed dans un repo public est OK.
