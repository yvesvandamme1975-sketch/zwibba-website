# Zwibba Fashion Jewelry Backfill Design

**Date:** 2026-05-27

## Goal

Reclasser les `Listing` et `Draft` Zwibba déjà persistés dont `categoryId === 'fashion'` et dont `attributesJson.fashion.itemType` appartient aux cinq sous-types vêtements (`tops`, `dress_skirt`, `jacket_sweater`, `pants`, `shoes`) mais qui décrivent en réalité un bijou (bague, boucles d'oreilles, collier, bracelet, montre). Approche : heuristique mots-clés français sur `title` et `description`, dry-run par défaut, journal JSON détaillé, write opt-in derrière un flag `--apply`.

## Problem

La PR #6 (`feat: jewelry fashion subtypes`) a livré la taxonomy étendue et le prompt Gemini mis à jour. Tout nouveau brouillon créé après le deploy 2026-05-27 06:18 UTC sera classifié correctement. Mais les annonces antérieures gardent leur `attributesJson` legacy : par exemple la bague en or blanc observée en prod conserve `{itemType: 'dress_skirt', size: 'M'}` même après le deploy. Sans intervention, le bloc `Détails` côté buyer continue à montrer `Type d'article : Robe / Jupe`, `Taille : M`. Le contrat seller-driven prévu par le design jewelry-fashion-subtypes (« le vendeur corrige à la main si besoin ») suppose qu'un vendeur ouvre son listing et republie, ce qui n'arrive jamais en pratique sur une marketplace internal beta.

Aucun mécanisme actuel ne reclasse rétroactivement. `apps/api/src/listings/listings.service.ts` n'expose pas d'API d'update masse. La seule infrastructure de script standalone côté API est `apps/api/scripts/seed-system-listings.ts`, qui instancie un `PrismaService` à la main, fait son travail, et déconnecte — c'est le template à reproduire pour un backfill.

L'écran de détail buyer (`App/features/listings/listing-detail-screen.mjs`) lit `attributesJson` brut depuis l'API : tout fix doit donc passer par une mutation Postgres sur la colonne `attributesJson` des tables `Draft` et `Listing` (déclarées en `Json?` dans `apps/api/prisma/schema.prisma`).

## Non-Goals

- Ne pas re-déclencher l'IA Gemini sur les images des listings existants. Le coût (rate-limit + crédit) et la complexité de réingestion sont trop élevés pour un internal beta avec quelques dizaines d'annonces concernées. L'heuristique mots-clés FR sur `title` + `description` est suffisante à ce stade.
- Ne pas créer une surface admin web (bouton « Reclasser » dans `apps/admin/`). C'est un script CLI one-shot, idempotent, à exécuter à la main par Yves quand il valide la liste des reclassifications proposées.
- Ne pas modifier la colonne `categoryId` : on ne change pas la catégorie top-level, on ne touche qu'à `attributesJson.fashion.itemType` et `attributesJson.fashion.size`. Les listings restent en `fashion`.
- Ne pas backfiller les bijoux mal classés dans d'autres catégories que `fashion` (par exemple une bague rangée en `electronics` par erreur). Hors-scope, traité au cas par cas si signal.
- Ne pas reclasser des items ambigus. Si un même titre matche plusieurs sous-types bijoux (rare mais possible : « parure bague et collier ») le script log l'ambiguïté et n'applique rien.
- Ne pas écrire dans `attributesJson.fashion.size` une nouvelle valeur. Toujours la vider (`''` ou clé omise) quand on bascule vers un sous-type bijou — la taille `M` héritée d'un mauvais `dress_skirt` n'a aucun sens sur une bague.

## Existing System

**Schéma Prisma** — `apps/api/prisma/schema.prisma` déclare `Draft.attributesJson` et `Listing.attributesJson` en `Json?`. Migration `20260501110000_listing_attributes_json` les a posées. Pas de migration à ajouter ici.

**Helpers fashion** — `apps/api/src/common/fashion-attributes.ts` exporte la nouvelle liste `fashionItemTypeValues` incluant les cinq sous-types bijoux après PR #6. `normalizeFashionItemType` accepte tous les ids ; `normalizeFashionSize` retourne `''` pour les sous-types sans grille.

**Pattern de script standalone** — `apps/api/scripts/seed-system-listings.ts` est le template : import `reflect-metadata`, instanciation `PrismaService`, opération, déconnexion. Lancement via `pnpm -C apps/api exec tsx scripts/seed-system-listings.ts` ou similaire.

**Données concernées** — d'après le screenshot prod observé le 2026-05-27, au moins deux listings sont concernés (bague en or blanc → `dress_skirt`, boucles d'oreilles à strass → `tops`). Le volume total réel sera révélé par la phase dry-run du script. Estimation prudent : < 50 listings sur l'internal beta.

**Aucun helper existant** ne parse `title` ou `description` en français pour détecter un type de bijou. C'est ce que le script va introduire.

## Recommended Architecture

### 1. Helper de détection `detectJewelryItemTypeFromText`

Créer `apps/api/src/common/jewelry-text-detection.ts` exportant une fonction pure `detectJewelryItemTypeFromText(text: string): FashionItemType | null`. Elle normalise le texte (lowercase, NFD + strip diacritiques) et applique des patterns ordonnés :

- `\bbagues?\b` ou `\bring\b` ou `\balliances?\b` → `jewelry_ring`
- `\bboucles?\s+d['']?oreilles?\b` ou `\b(?:earrings?|puces?\s+d['']?oreilles?)\b` ou la séquence isolée `\bbo\b` (à condition d'être entourée de mots de contexte fashion) → `jewelry_earrings`
- `\bcolliers?\b` ou `\bpendentifs?\b` ou `\bchaines?\b` ou `\bsautoirs?\b` ou `\bnecklaces?\b` → `jewelry_necklace`
- `\bbracelets?\b` ou `\bgourmettes?\b` ou `\bjoncs?\b` ou `\bmanchettes?\b` → `jewelry_bracelet`
- `\bmontres?\b` ou `\bwatchs?\b` → `jewelry_watch`

Règles :
- ordre des règles non significatif ; on rassemble tous les matches puis on tranche.
- si un seul sous-type matche → renvoyer ce sous-type.
- si zéro match → renvoyer `null`.
- si plusieurs sous-types distincts matchent → renvoyer `null` et laisser le script logger l'ambiguïté. Préférer le silence à l'erreur.

### 2. Helper de candidate pour un record fashion

Créer une seconde fonction utilitaire dans le même module (ou dans `apps/api/src/common/fashion-backfill.ts`) : `proposeJewelryBackfillForRecord({ categoryId, attributesJson, title, description })` qui retourne soit `null` (rien à faire), soit `{ from: { itemType, size }, to: { itemType: jewelry_*, size: '' }, evidence: string }` où `evidence` est l'extrait de texte qui a déclenché le match.

Critères pour candidater :
- `categoryId === 'fashion'`
- `attributesJson?.fashion?.itemType ∈ {'tops', 'dress_skirt', 'jacket_sweater', 'pants', 'shoes'}`
- `detectJewelryItemTypeFromText(title + ' ' + description)` retourne un sous-type non nul

### 3. Script orchestrateur `backfill-fashion-jewelry.ts`

Créer `apps/api/scripts/backfill-fashion-jewelry.ts` sur le modèle de `seed-system-listings.ts`. Il :

- parse `process.argv` pour détecter `--apply` (default : dry-run)
- instancie `PrismaService`
- charge tous les `Draft` et `Listing` où `categoryId === 'fashion'`
- pour chaque, appelle `proposeJewelryBackfillForRecord`
- agrège un résumé : `{ scanned, candidatesById, ambiguousById, appliedById, skippedReasons }`
- si `--apply` est présent, pour chaque candidate exécute un `prisma.listing.update` ou `prisma.draft.update` qui remplace `attributesJson` en gardant les autres clés top-level et en réécrivant `attributesJson.fashion` à `{itemType: newItemType, size: ''}`
- log le JSON résumé sur stdout, qu'il y ait `--apply` ou non

Le script ne touche jamais à `categoryId`, jamais à `title`, jamais à `description`, jamais à d'autres champs.

### 4. Tests unitaires

Couvrir trois niveaux :

- `detectJewelryItemTypeFromText` : sur une trentaine de cas représentatifs FR — bague seule, boucles avec apostrophe typographique, collier vs chaîne, montre, ambiguïté, négatif (description neutre vêtements).
- `proposeJewelryBackfillForRecord` : passé une bague mal classée `dress_skirt`, renvoie un objet `to: jewelry_ring, size: ''` ; passé un t-shirt légitime, renvoie `null`.
- Le script lui-même n'est pas testé end-to-end (script CLI standalone). À la place, un test sur la fonction principale `runBackfillOnce(prisma, { apply })` qui agrège la logique et est appelée par le wrapper CLI — ce qui rend l'orchestration testable avec un mock minimal de prisma.

### 5. Procédure d'exécution

Le plan livre aussi un runbook court : comment Yves doit exécuter le script.

1. Pull la branche source à jour, vérifier `pnpm install` à jour
2. Dry-run : `pnpm -C apps/api exec tsx scripts/backfill-fashion-jewelry.ts`
3. Lire le JSON, valider visuellement les candidates par `id` + `evidence`
4. Si OK, apply : `pnpm -C apps/api exec tsx scripts/backfill-fashion-jewelry.ts --apply`
5. Snapshot le JSON résultat dans le vault (note `_proj/zwibba/backfills/2026-05-27.md`)

Pas de rollback automatique. La restauration en cas d'erreur passe par le snapshot des `attributesJson` originaux que le script doit logger dans le JSON dry-run, fichier par fichier — ce qui permet à Yves de générer manuellement les `UPDATE` SQL inverses si besoin.

### 6. Garde-fous

- Le script refuse de tourner si `process.env.DATABASE_URL` n'est pas défini (évite un connect vers une DB par défaut).
- Le mode `--apply` exige aussi un flag `--confirm-apply` pour éviter une faute de frappe.
- Le script ne traite jamais plus de 500 records en une exécution. Si la query Prisma en retourne plus, il logge un warning et stoppe — protection contre un appel accidentel sur une DB de production massive.

## Runbook

1. `git checkout codex/website-vitrine-backup && git pull --ff-only origin codex/website-vitrine-backup`
2. `pnpm -C apps/api install`
3. Dry-run: `pnpm -C apps/api exec tsx scripts/backfill-fashion-jewelry.ts`
4. Read the JSON, verify each candidate's `evidence` and `to.itemType`. If any candidate looks wrong, stop and patch the heuristic before applying.
5. Apply: `pnpm -C apps/api exec tsx scripts/backfill-fashion-jewelry.ts --apply --confirm-apply`
6. Save the resulting JSON to `_proj/zwibba/backfills/2026-05-27.md` in the Obsidian vault for audit.
