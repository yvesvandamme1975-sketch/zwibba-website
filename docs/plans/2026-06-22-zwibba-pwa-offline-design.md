# Zwibba PWA Offline Design

**Date:** 2026-06-22

## Goal

Rendre l app web (`/App/`) installable et utilisable hors connexion sur les reseaux mobiles instables de la RDC : chargement instantane depuis le cache, plus de page blanche quand le reseau saute.

## Problem

`scripts/build.mjs` produit `dist/App/index.html` + les assets sous `dist/assets/app/` (65 modules ESM copies depuis `App/`), mais il n y a ni manifest web, ni service worker, ni icones d installation. L app exige donc le reseau a chaque ouverture et white-screen hors ligne. L origine navigateur reelle est le service website (`website-production-7a12`), qui sert ces fichiers via `server.mjs`.

## Non-Goals

- Pas de mise en cache des donnees API (les annonces, le chat restent network-only ; offline = shell + assets, pas la data).
- Pas de background sync ni de push notifications.
- Pas de PWA pour la landing publique `/` (priorite a l app).
- Pas de bundler (la contrainte vanilla ESM est conservee).

## Existing System

`renderAppPage()` rend le head/body de `/App/`. `build.mjs` copie `public/` vers `dist/`, ecrit les assets de marque, et `cpSync(App -> dist/assets/app)`. `server.mjs` sert `.webmanifest` et `.js` avec les bons MIME. Les tests `tests/build.test.mjs` valident les artefacts de `dist/`.

## Recommended Architecture

### 1. Manifest web installable

`build.mjs` ecrit `dist/manifest.webmanifest` (fonction `renderManifest()`) : name Zwibba, `start_url`/`scope` = `/App/`, `display: standalone`, couleurs de marque `#1E1E20`, icones 192 et 512 (`purpose: any maskable`). `renderAppPage()` reference le manifest et un `apple-touch-icon`.

### 2. Service worker offline-shell

`src/site/service-worker.js` precache le shell (`/App/`, app.js, app.css, styles.css, manifest) a l install, nettoie les vieux caches a l activation, et en fetch : navigations en network-first avec repli sur le shell cache ; assets `/assets/` et `/App/` en stale-while-revalidate (les 65 modules ESM deviennent disponibles hors ligne apres la 1re visite) ; cross-origin (API, fonts) passe au reseau sans interception. `build.mjs` ecrit le SW dans `dist/App/sw.js` en injectant `CACHE_VERSION = zwibba-<timestamp>` a chaque build (cache-busting automatique).

### 3. Icones

`public/assets/brand/icon-192.png` et `icon-512.png` (logo sur fond `#1E1E20`), copiees vers `dist/assets/brand/` par le `cpSync(public)` existant.

### 4. Enregistrement

Un script inline dans `renderAppPage()` enregistre `/App/sw.js` (scope `/App/`) au `load`, garde-fou `if ('serviceWorker' in navigator)`.
