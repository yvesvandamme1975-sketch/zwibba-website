> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

# Zwibba Modern Sharing Implementation Plan

**Goal:** Livrer le cadrage partage approuvé.
**Architecture:** Contrôleur ESM indépendant, dialogue commun, formats story et lien séparés, métadonnées par marché.
**Tech Stack:** Vanilla ESM, Node tests, NestJS, Prisma 6, sharp, Railway.

### Task 1: Index planning documents

**Files:**
- Create/Modify: `docs/plans/README.md`
- Create/Modify: `docs/plans/2026-09-07-zwibba-modern-sharing-design.md`
- Create/Modify: `docs/plans/2026-09-07-zwibba-modern-sharing-implementation.md`
- Create/Modify: `docs/operations/2026-09-07-cgu-sharing-review.md`

**Step 1: Write the failing test or change**

Ajouter les deux noms au début de l’index et conserver la revue indépendante.

**Step 2: Verify**

Run: `rg -n "2026-09-07-zwibba-modern-sharing" docs/plans/README.md`
Expected: les deux fichiers sont listés

**Step 3: Commit**

`git commit -m "docs: index modern sharing plans"`

### Task 2: Share action controller

**Files:**
- Create/Modify: `App/services/listing-share.mjs`
- Create/Modify: `tests/listing-share.test.mjs`

**Step 1: Write the failing test or change**

Écrire les tests avant le module : annulation sans repli, appel natif avant toute attente, titre du contexte, copie refusée avec alternative manuelle, popup bloquée, double clic, fichier HTTP/MIME/taille invalide. Constater l’échec, puis implémenter le contrôleur minimal et sa préparation de fichier.

**Step 2: Verify**

Run: `node --test tests/listing-share.test.mjs`
Expected: PASS après un échec initial module absent

**Step 3: Commit**

`git commit -m "fix: make listing share actions explicit and cancellable"`

### Task 3: Accessible share dialog integration

**Files:**
- Create/Modify: `App/app.js`
- Create/Modify: `App/components/share-menu.mjs`
- Create/Modify: `App/app.css`
- Create/Modify: `tests/share-menu.test.mjs`
- Create/Modify: `tests/listing-share.test.mjs`

**Step 1: Write the failing test or change**

Ajouter les tests du dialogue avant modification : contexte échappé, états image, succès et instructions explicites. Brancher le contrôleur, supprimer les anciens gestionnaires et comptages trompeurs, protéger le focus et proposer les actions distinctes. Vérifier aussi au navigateur.

**Step 2: Verify**

Run: `node --test tests/share-menu.test.mjs tests/listing-share.test.mjs tests/success-screen.test.mjs tests/listing-detail-screen.test.mjs`
Expected: PASS après échec des nouveaux cas sur le rendu ancien

**Step 3: Commit**

`git commit -m "fix: unify accessible listing share dialog"`

### Task 4: Separate landscape and story media

**Files:**
- Create/Modify: `apps/api/prisma/schema.prisma`
- Create/Modify: `apps/api/prisma/migrations/ (generated only)`
- Create/Modify: `apps/api/src/share/compose-story-image.ts`
- Create/Modify: `apps/api/src/share/story-image.service.ts`
- Create/Modify: `apps/api/src/listings/listings.service.ts`
- Create/Modify: `apps/api/test/share/compose-story-image.test.ts`
- Create/Modify: `apps/api/test/share/story-image.service.test.ts`
- Create/Modify: `shared/listing-og.mjs`
- Create/Modify: `tests/listing-og.test.mjs`
- Create/Modify: `server.mjs`
- Create/Modify: `tests/server-runtime.test.mjs`

**Step 1: Write the failing test or change**

Écrire d’abord les cas de formats paysage, zéro EUR, fetch en échec, métadonnées BE/CD et page indisponible. Constater les échecs. Ajouter le champ optionnel par Prisma migrate diff (SQL généré), composer et stocker les deux formats, exposer le marché, mettre à jour les OG et statuts HTTP. Adapter le nom du test serveur uniquement si le fichier canonique porte déjà un autre nom, en documentant cette découverte avant édition.

**Step 2: Verify**

Run: `node --test tests/listing-og.test.mjs && pnpm -C apps/api test -- share`
Expected: PASS après les échecs initiaux des nouveaux cas

**Step 3: Commit**

`git commit -m "fix: separate landscape previews from story images"`

### Task 5: Verification and delivery record

**Files:**
- Create/Modify: `docs/operations/2026-09-07-modern-sharing-verification.md`

**Step 1: Write the failing test or change**

Exécuter build, suites web/API/admin et smoke de contrats. Corriger et reverifier uniquement les régressions. Documenter résultats, limitations iPhone et état des anciens compteurs. Faire relire le diff à Claude.

**Step 2: Verify**

Run: `npm test && npm run build && npm run smoke:production-contracts && pnpm -C apps/api test && pnpm -C apps/admin test`
Expected: PASS ; toute divergence est signalée avant poursuite

**Step 3: Commit**

`git commit -m "docs: record modern sharing verification"`

## Delivery after committed tasks

Follow docs/operations/git-and-releases.md, which supersedes the old deploy recipe. PR target codex/website-vitrine-backup. Before merge record active website/API deployment IDs and SHA. After CI and review merge, verify both affected services SUCCESS at merged SHA. HTTP200 on /, /app/, API /healthz ; /assets/app/app.js contains « Copier la légende ». Verify one published listing page uses market-aware metadata; verify a generated landscape fixture is 1200x630. Existing listings without shareImageUrl deliberately retain photo fallback. Record failures and rollback using verified Railway CLI syntax if necessary. Do not declare native iPhone delivery verified by browser simulation.
