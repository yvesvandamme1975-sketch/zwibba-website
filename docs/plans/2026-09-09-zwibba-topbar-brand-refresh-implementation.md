> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

# Zwibba Topbar Brand Refresh Implementation Plan

**Goal:** Livrer la signature Z + Zwibba stable avec contexte pays distinct.

**Architecture:** Renderer partage existant, styles topbar, handlers limites au choix du pays ; retours precedes par la marque dans le DOM. Aucun nouveau framework.

**Tech Stack:** ESM, CSS, node:test, Playwright, GitHub et Railway existants.

Ce plan autonome execute uniquement la topbar approuvee le 9 septembre. Il remplace les passages topbar des taches 4/5/8/9 du plan buyer-ui-hierarchy, sans executer leurs autres fonctionnalites. Branche `codex/topbar-brand-refresh`, construite sur les trois commits locaux preserves dont le correctif de hauteur des categories.

### Task 1: Indexer le lot topbar

**Files:**
- Create: `docs/plans/2026-09-09-zwibba-topbar-brand-refresh-design.md`
- Create: `docs/plans/2026-09-09-zwibba-topbar-brand-refresh-implementation.md`
- Modify: `docs/plans/README.md`

**Step 1: Write the change**

Indexer cette paire et consigner sa portee par rapport au plan general.

**Step 2: Verify**

Run: `rg '2026-09-09-zwibba-topbar-brand-refresh' docs/plans/README.md`

Expected: les deux noms apparaissent. `git diff --check` propre.

**Step 3: Commit**

`git commit -m "docs: scope topbar brand refresh"`

### Task 2: Definir les regressions de rendu

**Files:**
- Modify: `tests/in-app-brand.test.mjs`
- Modify: `tests/country-indicator.test.mjs`
- Modify: `tests/app-home.test.mjs`
- Modify: `tests/app-buyer-home.test.mjs`
- Modify: `tests/seller-public-screen.test.mjs`

**Step 1: Write the failing tests**

Definir signature sans slogan/Beta, nom non traduit, pays statique sans faux lien, selecteur reserve au visiteur Acheter et present une seule fois. Tester les pays inconnus et valeurs echappees, marque sur chaque etat du profil public.

**Step 2: Verify RED**

Run: `node --test tests/in-app-brand.test.mjs tests/country-indicator.test.mjs tests/app-home.test.mjs tests/app-buyer-home.test.mjs tests/seller-public-screen.test.mjs`

Expected: nouveaux contrats FAIL sur l'ancien rendu, protections existantes conservees.

**Step 3: Commit**

`git commit -m "test: define stable branded topbar"`

### Task 3: Implementer la topbar

**Files:**
- Modify: `App/components/in-app-brand.mjs`
- Modify: `App/features/home/buy-screen.mjs`
- Modify: `App/features/home/home-screen.mjs`
- Modify: `App/features/profile/seller-public-screen.mjs`
- Modify: `App/features/auth/*.mjs` (reordonner seulement la marque et Retour)
- Modify: `App/features/post/*.mjs` (reordonner seulement la marque et Retour)
- Modify: `App/features/chat/thread-screen.mjs`
- Modify: `App/features/listings/listing-detail-screen.mjs`
- Modify: `App/app.js`
- Modify: `App/app.css`

**Step 1: Write the minimal implementation**

Implementer le renderer pur avec options explicites et fallback pays existant. Reutiliser `set-browse-country`, fermer le menu et restaurer focus apres rerendu. Marque avant Retour dans le DOM et dans les conteneurs ; pays inconnu omis. CSS limite a l'en-tete, marges et alignement du haut de page, sans modifier les tokens globaux. Conserver les controles accessibles au zoom et la hauteur des categories.

**Step 2: Verify GREEN**

Run: `node --test tests/in-app-brand.test.mjs tests/country-indicator.test.mjs tests/app-home.test.mjs tests/app-buyer-home.test.mjs tests/seller-public-screen.test.mjs tests/app-buyer-routing.test.mjs tests/app-shell-ui.test.mjs tests/listing-detail-screen.test.mjs`

Expected: PASS. `npm run build` et `git diff --check` passent.

**Step 3: Commit**

`git commit -m "feat: refresh Zwibba topbar and market control"`

### Task 3b: Stabiliser les erreurs revelees par la recette

Ajout explicite pendant la recette : WebKit a revele que `primeBuyerRouteState` relance les requetes a chaque rendu quand les donnees restent nulles apres erreur. Ce defaut precede la topbar et concerne fiche, vendeur et conversation ; le chargement du profil connecte sur vendeur a la meme condition.

**Files:**
- Create: `tests/route-load-error-stability.test.mjs`
- Modify: `App/app.js`
- Modify: ce plan pour consigner la deviation

**Step 1: Write the failing tests and minimal fix**

Reproduire les relances sur deux rendus avec donnees nulles en loading/error. Respecter le statut explicite et l'identite de la route. Une nouvelle entree utilisateur sur une route en erreur permet une nouvelle tentative ; aucune boucle de rendu. Ne pas changer le polling normal de messagerie.

**Step 2: Verify RED then GREEN**

Run: `node --test tests/route-load-error-stability.test.mjs tests/app-buyer-routing.test.mjs`

Expected: RED observe avant correctif (7 echecs de la nouvelle suite), puis PASS, y compris entree idle, changement d'identite et retour utilisateur apres erreur. Refaire toute la recette de Task 4 apres ce changement.

**Step 3: Commit**

`git commit -m "fix: keep failed route loads stable between renders"`

### Task 3c: Rendre le profil public accessible sans brouillon

Ajout explicite pendant la recette : l'assertion de route a revele que `seller` manquait dans les routes autorisees sans brouillon et redirigeait donc vers capture. Cette correction est necessaire pour verifier et livrer la marque sur le profil public.

**Files:**
- Modify: `App/utils/post-publish-draft-state.mjs`
- Modify: `tests/post-publish-draft-state.test.mjs`
- Modify: ce plan

**Step 1: Write the failing test and minimal fix**

Definir que `seller` reste accessible sans brouillon ; ajouter seulement ce type a l'ensemble existant. Les vrais ecrans de brouillon conservent leur garde.

**Step 2: Verify RED then GREEN**

Run: `node --test tests/post-publish-draft-state.test.mjs`

Expected: nouveau test RED observe (`capture` au lieu de `seller`), puis 7/7 PASS. Refaire la recette de Task 4.

**Step 3: Commit**

`git commit -m "fix: allow public seller browsing without a draft"`

### Task 4: Verifier et consigner la recette

**Files:**
- Create: `scripts/e2e/topbar-brand-refresh.mjs`
- Create: `docs/deployment/2026-09-09-topbar-brand-refresh-qa.md`

**Step 1: Write the verification**

Playwright avec API interceptee localement, `UI_TEST_BASE_URL`. Verifier les cinq onglets, fiche, vendeur, auth/capture, pays visiteur/connecte, Escape/exterieur, focus au choix pays, petits formats et zoom. Capturer les boites et screenshots ; verifier les assets charges. Ne pas ecrire de donnees de test en production. Toute regression observee est reproduite avant sa correction.

**Step 2: Verify**

Run: `npm test`

Run: `npm run build`

Run: `npm run smoke:production-contracts`

Run: `npm run smoke:app`

Lancer le serveur sur un port libre, par exemple `PORT=4340 npm start`.

Run: `UI_TEST_BASE_URL=http://127.0.0.1:4340 node scripts/e2e/topbar-brand-refresh.mjs`

Expected: PASS et preuves consignees, distinction emulation/appareils reels. Recette contraste/focus sur les composants modifies ; pas de score Lighthouse invente.

**Step 3: Commit**

`git commit -m "test: verify topbar brand refresh end to end"`

## Conditional Release

Apres revue, suite complete verte et worktree propre, pousser la branche et ouvrir la PR vers `codex/website-vitrine-backup`. Suivre `docs/operations/git-and-releases.md` : CI/revue, releve des deploys precedents, fusion, verification SHA/ID par service affecte. HTTP 200 sur zwibba.com et l'URL Railway website ; marqueurs `data-market-toggle` dans `/assets/app/app.js`, `.app-topbar` dans `/assets/app/app.css`, puis rendu/selection/Retour de l'app en ligne. Consigner les preuves post-deploy et restaurer la release precedente verifiee si le parcours casse. Pas d'upload website aveugle ni de push trunk direct.
