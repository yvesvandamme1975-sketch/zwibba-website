# Zwibba Landing i18n Foundation (P4) Design

**Date:** 2026-08-06

## Goal

Poser la fondation multilingue de la vitrine (et d'elle seule) : tout le texte visible sort des templates vers des modules de locale (`fr-CD` d'abord, à sortie strictement identique), puis les modules `fr-BE` et `nl-BE` sont créés avec les traductions — prêts pour l'émission des arborescences `/be/` et `/be/nl/` en P5.

## Problem

La vitrine porte ~360 chaînes françaises structurées dans `src/site/content.mjs` (dont ~260 dans les 13 annonces de démonstration RDC) et **~170 chaînes supplémentaires enfouies en dur dans les templates** de `scripts/build.mjs` (labels, options de filtres, dialogues, aria, formulaires) plus une douzaine dans `src/site/app.js`. Aucune couche de locale n'existe. Pièges relevés par l'inventaire : `<html lang="fr">` littéral (2×), valeurs du filtre « état » = libellés français servant aussi de valeurs machine (`data-condition`), `formatCdf()` figé sur `fr-FR`/CDF, descriptions schema.org dupliquées à la main, `priceCurrency: 'CDF'` en dur dans le JSON-LD, contenus dupliqués inline (étapes ambassadeur, note-cards à-propos), et `site.locale = 'fr_CD'` qui écrase deux axes indépendants (marché et langue) en une chaîne.

## Non-Goals

- **Pas d'émission de pages `/be/` ni `/be/nl/`, pas de hreflang, pas de sitemap multi-locale** — paire P5. P4 rend l'émission triviale, il ne l'exécute pas.
- **L'App PWA reste 100 % française** (`renderAppPage`, `renderManifest`) — hors périmètre, ne pas balayer dans la paramétrisation.
- Pas de décision sur les annonces de démonstration belges (les modules BE exportent `listings: []`) — décision produit en P5.
- Pas de bibliothèque i18n (i18next…) : pas de bundler, 3 locales, rendu statique — des modules ESM plats suffisent.
- `shared/listing-og.mjs` (OG dynamique servi par `server.mjs`) reste CD-only — sa localisation dépend du routage P5.

## Existing System

`scripts/build.mjs` (1353 lignes) importe les exports nommés de `content.mjs` et les consomme dans des fonctions `renderXPage()` ; `build()` écrit un tableau plat de `{file, path, html}` dans `dist/`. `tests/build.test.mjs` (428 lignes) asserte des chaînes françaises exactes sur la sortie `dist/` racine — c'est le filet de sécurité : il doit rester vert sans modification pendant toute la refonte, sauf là où un piège corrigé (valeurs de filtre) change légitimement la sortie. `window.ZWIBBA_API_BASE_URL` et `window.ZWIBBA_SUPPORT_WHATSAPP` montrent le pattern d'injection build-time réutilisable pour les chaînes d'`app.js`.

## Recommended Architecture

### 1. Modules de locale miroirs (pas de catalogue t() plat)

`src/site/locales/fr-cd.mjs` reprend les exports actuels de `content.mjs` **à l'identique** (celui-ci devient un ré-export de compatibilité). Chaque module de locale porte les mêmes exports nommés + un objet `site` enrichi de la config locale-dépendante : `htmlLang`, `ogLocale`, `market`, `language`, `currency`, `priceLocale`, `urlPrefix` (`''` pour fr-CD). Marché et langue deviennent deux champs distincts.

### 2. Export `ui` pour les chaînes de template

Les ~170 chaînes inline de `build.mjs` migrent vers un export `ui` structuré par page (`ui.nav`, `ui.gate`, `ui.landing`, `ui.browse`, `ui.listing`, `ui.ambassador`, `ui.about`, `ui.contact`, `ui.referral`, `ui.safetyTips`). Les duplications inline (étapes ambassadeur, note-cards) sont promues dans le module de locale. Le filtre « état » devient des paires `{code, label}` (le `value`/`data-condition` utilise `code`, stable inter-langues) — correction du piège, répercutée dans `src/site/app.js`.

### 3. Pipeline de rendu paramétré, sortie racine inchangée

Les fonctions de rendu reçoivent un objet `content` (destructuré) au lieu des imports de module ; `build()` construit la page avec le module fr-CD. Garantie de non-régression en deux temps : après la paramétrisation pure, `dist/` est **octet pour octet identique** (vérifié par diff récursif contre un build de référence) ; après l'extraction `ui`, seuls les `value` du filtre état changent (documenté, testé). `formatCdf` devient `formatPrice(site)` ; `<html lang>`, `og:locale`, `priceCurrency` JSON-LD et les descriptions schema.org partagent désormais les mêmes constantes que le texte visible.

### 4. Chaînes d'app.js injectées + traductions BE

Les chaînes client (`Lien copié`, annonceur de menu, corps mailto, résumé pluralisé) passent par `window.ZWIBBA_UI_STRINGS` injecté au build (avec un mini-helper de pluriel par locale). Enfin, `src/site/locales/fr-be.mjs` et `nl-be.mjs` sont créés : mêmes exports, copie traduite/adaptée (fr-BE ajuste marché/devise/libellés ; nl-BE traduit tout en néerlandais), `listings: []`, et un **test de parité structurelle** garantit que chaque locale expose exactement les mêmes clés que fr-CD. Les traductions nl sont générées puis marquées pour relecture par un locuteur natif avant le lancement public (note en tête de module).
