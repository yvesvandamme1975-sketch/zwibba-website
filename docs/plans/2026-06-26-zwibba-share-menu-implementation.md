# Zwibba Share Menu Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Un bouton "Partager" qui ouvre une feuille (WhatsApp, Facebook, Instagram, Copier), cross-plateforme.

**Architecture:** App/components/share-menu.mjs (renderShareMenu) + state.shareMenu pilote par renderApp ; boutons des ecrans -> open-share-menu ; handlers app.js (open/close/instagram) reutilisant les handlers existants. Verifie par tests node + build + rendu.

**Tech Stack:** Vanilla JS ESM, node:test.

---

### Task 1: Index the planning docs
Append the two filenames to docs/plans/README.md. Commit docs: index share-menu plans.

### Task 2: Composant feuille de partage
App/components/share-menu.mjs + tests/share-menu.test.mjs (options + contexte).

### Task 3: Cablage app.js + ecrans + CSS
state.shareMenu, renderShareMenu dans renderApp, handlers open/close/instagram, fermeture apres action ; boutons success-screen + listing-detail en open-share-menu ; styles App/app.css. Mettre a jour les tests d ecran (share-listing -> open-share-menu). Verifier node --check app.js, node scripts/build.mjs, node --test tests/*.test.mjs, npm run smoke:website.
