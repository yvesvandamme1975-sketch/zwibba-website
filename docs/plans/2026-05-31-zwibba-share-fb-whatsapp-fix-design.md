# Zwibba Share FB WhatsApp Fix Design

**Date:** 2026-05-31

## Goal

Réparer le partage social des annonces depuis le success-screen de la PWA pour que (1) un lien partagé sur Facebook affiche une carte brandée avec image au lieu d'un lien nu, et (2) le bouton « Partager sur WhatsApp » ouvre effectivement WhatsApp avec le texte pré-rempli au lieu de ne rien faire.

## Problem

Deux symptômes confirmés par Yves le 2026-05-31 (capture du composer Facebook « Nouvelle publication » montrant uniquement `website-production-7a12.up.railway.app` + titre « Zwibba App », sans vignette ; bouton WhatsApp sans redirection).

Cause racine du partage Facebook sans image. L'URL partagée est construite par `buildShareableListingUrl(listingId)` qui retourne `${window.location.origin}/App/` ou `${window.location.origin}/App/?listing=<id>`. Cette page est le shell de l'application monopage généré par `renderAppShellDocument()` dans `scripts/build.mjs`. Le `headExtra` de ce document ne contient que `<title>Zwibba App</title>` et `<meta name="robots" content="noindex,nofollow" />` — aucune balise Open Graph (`og:image`, `og:title`, `og:description`, `og:url`). Quand Facebook (ou WhatsApp) scrape l'URL, il ne trouve aucune image et tombe sur le titre générique « Zwibba App », d'où la carte nue. À noter : les pages SEO statiques `/annonce/{slug}/index.html`, elles, portent déjà un jeu Open Graph complet (et, depuis le plan share-story-image du 2026-05-27 mergé sur la branche, un `og:image` brandé 1080×1920 quand `storyImageUrl` existe) — mais ce n'est pas l'URL qui est partagée depuis le success-screen.

Cause racine du bouton WhatsApp inerte. Deux facteurs cumulés, tous deux vérifiés dans le code. (1) Le délégateur de clic `handleListingShareAction(event)` dans `App/app.js` récupère `event.target.closest('[data-action]')` puis branche explicitement `copy-listing-link`, `share-native` et `share-facebook` (chacun fait `event.preventDefault()` puis son traitement, et `share-facebook` ouvre via `window.open(...)`). Il n'existe **aucun case pour `share-whatsapp-chat`** : le bouton WhatsApp est rendu comme une ancre `<a data-action="share-whatsapp-chat" href="...wa.me/?text=..." target="_blank">` (dans `App/features/post/success-screen.mjs`) qui ne repose que sur son `href` natif, sans handler JS dédié — contrairement au bouton Facebook qui, lui, est un `<button>` piloté par `handleFacebookShare()` (`window.open`), ce qui explique que Facebook s'ouvre bien dans la capture alors que WhatsApp reste sans réaction. (2) L'URL de l'ancre est construite par `buildWhatsAppShareUrl()` sous la forme `https://wa.me/?text=<texte encodé>` ; `wa.me/?text=` **sans numéro de téléphone** n'est pas une URL Click-to-Chat fiable (elle charge souvent la page d'accueil `wa.me` plutôt qu'une conversation). Le point d'entrée canonique pour un partage de texte sans destinataire est `https://api.whatsapp.com/send?text=`. Le bouton Facebook, lui, utilise `https://www.facebook.com/sharer/sharer.php?u=` (correct) — le problème Facebook est donc l'absence d'OG sur la cible, pas le bouton.

Source de l'URL partagée (vérifiée). Au runtime, `listingUrl` provient de `buildListingUrl(state.draft)` (ou de l'attribut `data-listing-url`) dans `App/app.js` ; la cible résolue est la page shell `/App/?listing=<id>` (titre « Zwibba App », confirmé par la capture), pas la page SEO `/annonce/{slug}/`.

## Non-Goals

- Ne pas refondre la génération de l'image story brandée (`apps/api/src/share/`, plan du 2026-05-27 déjà mergé). On réutilise `storyImageUrl` tel quel, on ne le régénère pas.
- Ne pas toucher au flux mobile Flutter (`apps/mobile/lib/features/post/publish_success_screen.dart`). Le scope reste la PWA `App/` + le générateur `scripts/build.mjs`.
- Ne pas implémenter de rendu server-side dynamique des balises OG par annonce sur la route `/App/?listing=<id>` (nécessiterait un serveur de rendu) ; on s'appuie sur une OG de base statique pour le shell et, optionnellement, sur la route SEO `/annonce/{slug}/` déjà brandée.
- Ne pas ajouter de bouton Instagram / Stories natives ni de nouveau canal de partage. On répare l'existant (WhatsApp + Facebook + copie de lien).
- Ne pas lever le `noindex,nofollow` du shell (sans rapport ; l'OG est scrapée indépendamment de l'indexation).

## Existing System

`scripts/build.mjs` — générateur de build statique. Contient `renderAppShellDocument()` dont le `headExtra` (vérifié) se limite à `<title>Zwibba App</title>` + `<meta name="robots" content="noindex,nofollow" />`. Contient aussi `buildShareableListingUrl(listingId)` qui retourne `${origin}/App/` ou `${origin}/App/?listing=<id>` (vérifié). Le même fichier génère les pages SEO `/annonce/{slug}/` avec un bloc OG complet incluant l'override `og:image` = `storyImageUrl` (vérifié via la sortie `dist/` et `tests/build.test.mjs`).

`App/features/post/success-screen.mjs` — composant de rendu du succès de publication (lu intégralement). `buildShareText()` assemble « Je vends sur Zwibba ! {titre} — {prix} — {listingUrl} ». `buildWhatsAppShareUrl()` retourne `https://wa.me/?text=<encodé>` (vérifié — c'est la source du bug 2). `buildFacebookShareUrl()` retourne `https://www.facebook.com/sharer/sharer.php?u=<encodé>` (vérifié, correct). Le markup rend une ancre `data-action="share-whatsapp-chat"`, une ancre `data-action="share-facebook"`, des boutons `share-native` + `download-story-image` (conditionnés à `storyImageUrl`), et un bouton `copy-listing-link`.

`App/features/post/post-flow-controller.mjs` — contrôleur du flux de publication (lu partiellement). Implémente le partage natif via `navigator.canShare({ files: [storyFile] })` + `navigator.share(shareData)` avec `shareData = { title, text, url: listingUrl }`, et gère les `data-action` `share-native`, `download-story-image`, `copy-listing-link`. Construit un `File` PNG (`zwibba-story.png`) à partir de la story image pour le partage natif.

`tests/success-screen.test.mjs` et `tests/post-flow.test.mjs` — suites `node --test` existantes couvrant le rendu des boutons et les affordances de partage. Servent de point d'ancrage TDD pour les modifications.

## Recommended Architecture

### 1. OG de base brandée sur le shell `/App/`

Étendre le `<head>` de `renderAppPage()` dans `scripts/build.mjs` (la fonction qui génère le document `/App/`, titre « Zwibba App ») avec un jeu Open Graph statique calqué sur celui déjà présent dans `renderLayout()` (lignes ~332-346) : `og:type=website`, `og:locale=${site.locale}` (`fr_CD`), `og:site_name=${site.name}` (`Zwibba`), `og:title` (« Zwibba App »), `og:description` (la description existante du shell), `og:url=${resolveUrl('/App/')}`, et surtout `og:image` pointant vers une image **raster** (PNG, jamais SVG) brandée 1200×630, avec `og:image:width`/`og:image:height` et `twitter:card=summary_large_image` + `twitter:image`. Cette OG de base garantit qu'aucun partage du shell n'apparaît sans vignette, quel que soit l'`?listing=<id>`.

Constat vérifié : aucun raster réutilisable n'existe sur la branche `codex/website-vitrine-backup` (pas de `public/`, pas de `og-default.png`, seul `Logo_zwibba.svg` est à la racine et il est en SVG, que Facebook/WhatsApp ne rendent pas ; le `renderLayout` actuel a d'ailleurs ce défaut avec son `ogImage` par défaut `/assets/brand/logo-zwibba.svg`). On ajoute donc un nouvel asset raster `og-default.png` (1200×630, fond `#0f160f`, wordmark Zwibba + bandeau vert « Je vends sur Zwibba »), fourni avec ce plan, placé à la racine du repo et copié vers `dist/assets/brand/og-default.png` par `scripts/build.mjs` (en miroir exact du `cpSync` existant qui copie `Logo_zwibba.svg` → `dist/assets/brand/logo-zwibba.svg`). L'`og:image` du shell pointe alors vers `${resolveUrl('/assets/brand/og-default.png')}`.

### 2. Partage par annonce vers la page SEO brandée (avec repli)

Pour obtenir une carte Facebook spécifique à l'annonce (photo produit + prix + logo via l'`og:image` story brandée déjà produite), faire pointer l'URL partagée vers la page SEO `/annonce/{slug}/` plutôt que vers `/App/?listing=<id>` lorsque le `slug` de l'annonce est disponible côté client au moment du partage. Modifier le calcul de `listingUrl` à sa source runtime (à confirmer : `App/app.js` et/ou `post-flow-controller.mjs`) pour préférer `${origin}/annonce/{slug}/` si un slug existe, et retomber sur `${origin}/App/?listing=<id>` sinon. Caveat assumé et à documenter pour Yves : les pages `/annonce/{slug}/` sont générées par un build statique périodique ; une annonce fraîchement publiée peut ne pas encore avoir sa page bâtie. L'OG de base de l'axe 1 couvre ce cas de repli (carte brandée générique plutôt que carte vide). Si le risque de page non encore bâtie est jugé trop élevé pour ce passage, l'axe 2 peut être livré séparément et l'axe 1 suffit à corriger le symptôme « lien nu ».

### 3. Bouton WhatsApp : handler explicite + URL Click-to-Chat fiable

Deux modifications complémentaires. D'abord, dans `App/features/post/success-screen.mjs`, remplacer dans `buildWhatsAppShareUrl()` la base `https://wa.me/?text=` par `https://api.whatsapp.com/send?text=`, point d'entrée documenté pour partager un texte sans destinataire, qui ouvre de façon fiable WhatsApp (app mobile ou WhatsApp Web) avec le sélecteur de contact et le texte pré-rempli ; le contenu du texte est inchangé. Ensuite, dans `App/app.js`, ajouter à `handleListingShareAction()` un case `share-whatsapp-chat` qui `event.preventDefault()` puis ouvre l'URL via `window.open(url, '_blank', 'noopener')` — en miroir exact de `handleFacebookShare()` — afin de ne plus dépendre du `href` natif de l'ancre (comportement inégal selon webview/navigateur). L'URL ouverte réutilise la même logique que `buildWhatsAppShareUrl` (texte « Je vends sur Zwibba ! {titre} — {listingUrl} »). Étendre `tests/post-flow.test.mjs` (ou la suite app.js équivalente) pour couvrir le dispatch de `share-whatsapp-chat`.

### 4. Couverture de tests

Étendre `tests/success-screen.test.mjs` pour asserter que l'URL WhatsApp générée commence par `https://api.whatsapp.com/send?text=` (et plus par `wa.me/?text=`), et que l'URL Facebook reste `https://www.facebook.com/sharer/sharer.php?u=`. Étendre `tests/build.test.mjs` pour asserter que le document shell généré par `renderAppShellDocument()` contient bien `og:image`, `og:title`, `og:description`, `og:url` et que l'`og:image` est une URL `.png`/`.jpg` (pas `.svg`). Si l'axe 2 est retenu, ajouter une assertion sur la préférence `/annonce/{slug}/` quand un slug est fourni.
