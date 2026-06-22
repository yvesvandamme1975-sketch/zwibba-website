# Zwibba PWA Offline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Manifest installable + service worker offline-shell + icones, integres au build statique du website.

**Architecture:** `renderManifest()` -> `dist/manifest.webmanifest` ; `src/site/service-worker.js` -> `dist/App/sw.js` avec `CACHE_VERSION` injecte au build ; icones 192/512 dans `public/assets/brand/` ; head + script d enregistrement dans `renderAppPage()`. Verifie par `tests/build.test.mjs` + `smoke:website` + smoke post-deploy.

**Tech Stack:** Node ESM, `scripts/build.mjs`, service worker natif, node:test.

---

### Task 1: Index the planning docs
Append the two filenames to docs/plans/README.md. Commit docs: index pwa-offline plans.

### Task 2: Icones d installation
Generer `public/assets/brand/icon-192.png` et `icon-512.png` (logo sur fond #1E1E20).

### Task 3: Service worker + manifest + build wiring
Creer `src/site/service-worker.js`. Dans `build.mjs` : `renderManifest()`, ecriture de `dist/manifest.webmanifest` et `dist/App/sw.js` (avec remplacement `__ZWIBBA_BUILD__`), liens head (manifest + apple-touch-icon) et script d enregistrement du SW dans `renderAppPage()`.

### Task 4: Tests + verification
Ajouter un test PWA a `tests/build.test.mjs` (manifest start_url/display/icones, icones presentes, SW avec CACHE_VERSION sans placeholder, head avec manifest + register). Verifier `node --test tests/*.test.mjs`, `npm run smoke:website`. Smoke post-deploy : /manifest.webmanifest 200 application/manifest+json, /App/sw.js 200 application/javascript.
