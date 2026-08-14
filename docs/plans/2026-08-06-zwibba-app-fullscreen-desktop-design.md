# Zwibba App Fullscreen Desktop Design

**Date:** 2026-08-06

## Goal

Faire de `/App/` une vraie page d'application : sur desktop, l'app occupe toute la hauteur du navigateur sans maquette téléphone ni texte marketing ; sur écrans larges (≥920px), le feed acheteur passe en grille multi-colonnes et la fiche annonce s'élargit. Sur mobile, le comportement actuel (app quasi plein écran, navigation fixée en bas) est conservé tel quel.

Approche retenue par Yves (2026-08-06) : **hybride progressif** — Phase A = suppression de la maquette + app pleine hauteur en colonne centrée ; Phase B = adaptation desktop des écrans où la largeur apporte de la valeur (feed en grille, fiche annonce élargie), les autres écrans (formulaires, chat, auth) restant en colonne contrainte.

## Problem

La page `/App/` générée par `scripts/build.mjs` présente l'app dans une mise en scène de démonstration :

- Sur desktop, l'app est enfermée dans une **maquette de téléphone** (`.app-standalone__frame` : cadre arrondi 42px, fausse encoche via `::before`, largeur max 470px) posée à côté d'un bloc marketing (`.app-standalone__note` : « Version web privée », bouton « Ouvrir l'app ») sous une topbar « Retour au site ».
- La hauteur de l'app est bornée à `min(920px, calc(100vh - 132px))` — elle ne remplit jamais le navigateur.
- Sur mobile (<640px), le CSS masque déjà la topbar et la note et supprime le cadre : l'app est déjà « plein écran ». Le markup marketing reste cependant présent dans le HTML, masqué en CSS.
- Le feed et la fiche annonce sont strictement mono-colonne : sur un écran 24–27", l'essentiel de la surface est vide, alors qu'un site de petites annonces sur desktop se consomme naturellement en grille (référence : leboncoin, Facebook Marketplace).

La vitrine ne pointe pas encore vers `/App/` — c'est voulu et hors périmètre ici.

## Non-Goals

- Pas de lien vitrine → app (décision séparée, plus tard).
- Pas de navigation latérale desktop ni de refonte du tab-shell : les onglets restent en bas de l'app à toutes les largeurs.
- Pas de mise en deux colonnes de la fiche annonce (galerie à gauche / infos à droite) : la fiche reste linéaire, simplement élargie. Une vraie mise en page deux colonnes est un plan futur si le besoin se confirme.
- Pas de changement des écrans formulaires (post flow, auth, profil, chat, wallet) au-delà de la contrainte de largeur centrée.
- Aucun changement mobile (<640px) : les règles `@media (max-width: 640px)` existantes qui donnent le scroll de page et la nav fixée en bas sont conservées.
- Aucun changement d'API, de service worker, de manifest, ni de SEO/OG de la page.

## Existing System

Tout vit sur la branche applicative (trunk : `codex/website-vitrine-backup`, pointe actuelle du travail : `codex/geo-country-suggestion`, PR #40). `main` ne porte que la landing Railway — ne pas y toucher.

- `scripts/build.mjs` — `renderAppPage()` (lignes ~265–346) génère `dist/App/index.html` : topbar `.app-standalone__topbar` (logo + « Retour au site »), section `.app-standalone__entry` contenant la note marketing `.app-standalone__note` et le cadre `.app-standalone__frame` > `.app-shell` > `.app-shell__viewport[data-app-root]`. Le JS de l'app (`/assets/app/app.js`) monte l'app dans `[data-app-root]`.
- `App/app.css` — la coquille : `.app-standalone` (largeur max 1180px), `.app-standalone__frame` (le « téléphone »), `.app-shell` (hauteur bornée), `.app-tab-shell` (contenu scrollable + nav 5 onglets en `grid`). Trois media queries structurantes : `@media (min-width: 920px)` (grille note+téléphone), `@media (max-width: 919px)` (centrage du cadre), `@media (max-width: 640px)` (mode mobile : chrome masqué, scroll de page, nav fixée).
- Écrans : `App/features/home/home-screen.mjs` et `buy-screen.mjs` rendent `<section class="app-home app-screen app-screen--home">` ; le feed récent est `.app-home__recent-feed { display: grid; gap: 12px; }` (mono-colonne) et la rangée « À la une » `.app-home__featured-row` (scroll horizontal). La fiche annonce (`App/features/listings/listing-detail-screen.mjs`) rend `<section class="app-flow app-flow--detail">` avec `.app-detail__gallery`, `.app-detail__media` (min-height 220px), thumbstrip 88px. Les autres écrans utilisent `.app-screen` ou `.app-flow`.
- Tests : `tests/app-shell-ui.test.mjs` (assertions regex sur `App/app.css` — dont une assertion desktop sur la grille note+téléphone qui devra changer), `tests/app-entry-copy.test.mjs` (assertions sur le HTML construit de `/App/` — exige aujourd'hui « Ouvrir l'app », qui disparaît), `tests/build.test.mjs` (exige `class="app-shell__viewport"[^>]*data-app-root` — conservé). Runner : `node --test tests/*.test.mjs`. Smoke : `npm run smoke:app`.

## Recommended Architecture

### 1. Phase A — markup : la page `/App/` devient l'app seule

`renderAppPage()` ne rend plus que la coquille applicative :

```html
<main class="app-standalone" id="main-content">
  <div class="app-shell">
    <div class="app-shell__viewport" data-app-root data-screen="home"></div>
  </div>
</main>
```

Topbar, note marketing, bouton « Ouvrir l'app » et wrapper `.app-standalone__frame`/`.app-standalone__entry` sont supprimés du HTML (et non plus masqués en CSS côté mobile). Le retour au site n'a plus d'affordance dédiée — cohérent avec le comportement mobile actuel où la topbar est déjà masquée. Les meta/OG/manifest/service-worker de la page sont inchangés.

### 2. Phase A — CSS : app pleine hauteur, colonne centrée

Dans `App/app.css` :

- Suppression des règles mortes : `.app-standalone__topbar`, `__brand*`, `__note*`, `__entry`, `__frame*`, la media query `(min-width: 920px)` actuelle (grille note+téléphone), la media query `(max-width: 919px)` (centrage du cadre), et dans le bloc `(max-width: 640px)` les `display: none` de la topbar/note et les règles du cadre.
- `.app-standalone` passe en pleine largeur sans padding ; `.app-shell` devient la colonne app : `width: min(100%, 520px)`, `margin: 0 auto`, `height: 100vh` avec surcharge `height: 100dvh`, `border-radius: 0`, bordures latérales fines conservées pour détacher la colonne du fond. Le modèle de scroll desktop existant est conservé : la coquille est fixe, `.app-tab-shell__content` scrolle à l'intérieur.
- Le bloc `(max-width: 640px)` conserve ses règles `.app-shell`/`.app-tab-shell*` actuelles (hauteur auto, scroll de page, nav fixée en bas) — zéro changement de comportement mobile.

### 3. Phase B — desktop ≥920px : coquille élargie + largeur par écran

Nouvelle media query `@media (min-width: 920px)` :

- `.app-shell { width: min(100%, 1080px); }` — la coquille s'élargit.
- Garde-fou par écran : `.app-screen, .app-flow { width: 100%; max-width: 640px; margin-inline: auto; }` — tous les écrans restent en colonne lisible par défaut (formulaires, chat, auth, profil, wallet).
- Exceptions : `.app-screen--home { max-width: none; }` (le feed exploite la largeur) et `.app-flow--detail { max-width: 760px; }` (fiche annonce élargie).
- Nav : `.app-tab-shell__nav` garde sa grille 5 colonnes mais avec des colonnes bornées et centrées (`grid-template-columns: repeat(5, minmax(0, 110px)); justify-content: center;`) pour ne pas étirer les onglets sur 1080px.

### 4. Phase B — feed en grille et fiche élargie

Dans la même media query ≥920px :

- `.app-home__recent-feed { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }` — le feed récent passe en grille fluide (2 à 4 colonnes selon la largeur). Les cartes `.app-home__listing-card` existantes sont déjà autonomes (grid interne) et supportent ce reflow sans changement de markup.
- `.app-home__featured-row { grid-auto-columns: 260px; }` — la rangée « À la une » reste en scroll horizontal, cartes un peu plus larges.
- `.app-flow--detail .app-detail__media, .app-flow--detail .app-detail__image { min-height: 380px; }` — la photo principale de la fiche profite de la largeur 760px.

### 5. Vérification

Chaque changement CSS/markup est verrouillé par les tests regex existants adaptés (`tests/app-shell-ui.test.mjs`, `tests/app-entry-copy.test.mjs`) plus de nouvelles assertions : absence du cadre téléphone dans le HTML construit, `100dvh` sur la coquille, grille `auto-fill` du feed à ≥920px, garde-fou `max-width` des écrans. Suite complète `node --test tests/*.test.mjs` + `npm run smoke:app` en fin de chaque phase. Contrôle visuel : `npm run build` puis `npx serve dist` aux largeurs 375px, 768px, 1280px, 1680px.
