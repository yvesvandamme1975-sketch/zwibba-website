> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

# Zwibba Legal Acceptance Implementation Plan

**Goal:** Préparer des documents exacts et une acceptation contractuelle traçable sans publier des brouillons.
**Architecture:** Catalogue commun vérifié, preuve en base, validation OTP atomique et parcours de réacceptation.
**Tech Stack:** Vanilla ESM, NestJS, Prisma6, PostgreSQL, Node tests.

### Task 1: Index legal plans

**Files:**
- Create/Modify: `docs/plans/README.md`
- Create/Modify: `docs/plans/2026-09-07-zwibba-legal-acceptance-design.md`
- Create/Modify: `docs/plans/2026-09-07-zwibba-legal-acceptance-implementation.md`

**Step 1: Write the failing test or change**

Ajouter les deux noms au début de l’index.

**Step 2: Verify**

Run: `rg -n "2026-09-07-zwibba-legal-acceptance" docs/plans/README.md`
Expected: les deux noms apparaissent

**Step 3: Commit**

`git commit -m "docs: index legal acceptance plans"`

### Task 2: Draft catalog and public pages

**Files:**
- Create/Modify: `apps/api/assets/legal/manifest.json`
- Create/Modify: `apps/api/assets/legal/draft-2026-09-07/ (nine new draft documents)`
- Create/Modify: `apps/api/assets/legal/catalog.mjs`
- Create/Modify: `apps/api/assets/legal/catalog.d.mts`
- Create/Modify: `shared/legal-pages.mjs`
- Create/Modify: `tests/legal-pages.test.mjs`
- Create/Modify: `scripts/build.mjs`
- Create/Modify: `docs/operations/2026-09-07-legal-decisions.md`

**Step 1: Write the failing test or change**

Écrire les tests avant le chargeur : catalogue draft inactif, publication complète, empreinte altérée, champs non remplis, langue manquante, échappement HTML. Vérifier l’échec initial puis créer chargeur, pages et brouillons revus.

**Step 2: Verify**

Run: `node --test tests/legal-pages.test.mjs`
Expected: PASS après échec initial module absent

**Step 3: Commit**

`git commit -m "feat: prepare verified legal document catalog"`

### Task 3: Acceptance ledger and backend gate

**Files:**
- Create/Modify: `apps/api/prisma/schema.prisma`
- Create/Modify: `apps/api/prisma/migrations/ (generated only)`
- Create/Modify: `apps/api/src/auth/legal-policy.ts`
- Create/Modify: `apps/api/src/auth/auth.service.ts`
- Create/Modify: `apps/api/src/auth/auth.controller.ts`
- Create/Modify: `apps/api/test/auth/legal-acceptance.test.ts`

**Step 1: Write the failing test or change**

Écrire les cas sans acceptation, version périmée avant OTP, transaction atomique, snapshot du document, session existante, double acceptation, catalogue inactif. Générer la migration via Prisma puis implémenter le contrôle sans inventer des preuves pour les comptes existants.

**Step 2: Verify**

Run: `pnpm -C apps/api test -- legal-acceptance`
Expected: PASS après échecs initiaux reproduits

**Step 3: Commit**

`git commit -m "feat: record versioned terms acceptance atomically"`

### Task 4: Client legal acceptance flow

**Files:**
- Create/Modify: `App/features/auth/terms-acceptance-screen.mjs`
- Create/Modify: `App/features/auth/otp-screen.mjs`
- Create/Modify: `App/services/auth-service.mjs`
- Create/Modify: `App/app.js`
- Create/Modify: `tests/terms-acceptance.test.mjs`
- Create/Modify: `tests/auth-service.test.mjs`

**Step 1: Write the failing test or change**

Écrire les tests du consentement non précoché, liens distincts, payload version/empreinte et erreurs ; intégrer le statut des sessions existantes et le formulaire OTP. Corriger les textes OTP qui prétendent simuler un envoi réel ; n’afficher le code de démonstration que si le challenge demo le fournit.

**Step 2: Verify**

Run: `node --test tests/terms-acceptance.test.mjs tests/auth-service.test.mjs`
Expected: PASS après échecs initiaux

**Step 3: Commit**

`git commit -m "feat: present explicit terms acceptance in account flows"`

### Task 5: Verify and document publication blockers

**Files:**
- Create/Modify: `docs/operations/2026-09-07-legal-verification.md`

**Step 1: Write the failing test or change**

Exécuter build et suites pertinentes, relire les textes et le diff avec Claude. Conserver le statut draft si les informations juridiques restent inconnues. Ne pas annoncer une publication inexistante.

**Step 2: Verify**

Run: `npm test && npm run build && npm run smoke:production-contracts && pnpm -C apps/api test && pnpm -C apps/api run build`
Expected: PASS ; activation réelle uniquement après finalisation des informations manquantes

**Step 3: Commit**

`git commit -m "docs: record legal acceptance verification"`

## Release conditions

Follow docs/operations/git-and-releases.md. All tests and review precede a PR to trunk. While legal facts remain unresolved, keep this branch reviewable and do not activate published status. If shipping the inactive preparation separately becomes useful, the release must explicitly record that no terms are in force. Activation requires complete verified manifest, real public links, website/API at the same reviewed version, document HTTP200 and SHA checks, then an account-flow smoke without fabricating acceptance for a real user. Public legal text marker is the actual published version and must be stated in the activation change, not invented now.
