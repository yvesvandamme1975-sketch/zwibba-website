# Zwibba Agents MD UX/UI Conventions Design

**Date:** 2026-05-21

## Goal

Étendre `AGENTS.md` avec une section "UX/UI conventions for `App/`" qui code les règles visuelles, sémantiques et d'accessibilité déjà présentes dans le code de la PWA, pour que Codex produise des features cohérentes sans avoir à les inférer ou les inventer à chaque run.

## Problem

`AGENTS.md` au commit `42c1ee3` couvre la stack, le layout du repo, le workflow plans, 8 règles d'exécution Codex, et les commandes shell. Il décrit *quoi* construire et *comment commit*, mais pas *à quoi ça doit ressembler* visuellement.

Les conventions UX/UI réelles existent — elles sont juste éparpillées et implicites :
- la palette canonique est définie dans `src/site/styles.css` (lignes 3-23, `:root` avec `--green #6be66b`, `--text #f5f7f6`, `--text-muted #b2b8b6`, `--green-soft rgba(107,230,107,0.12)`, `--radius-sm 14px`, `--radius-md 22px`, `--radius-lg 34px`, `--shadow-green 0 14px 48px rgba(107,230,107,0.18)`, `--max-width 1180px`) et consommée transversalement par `App/app.css` via `var(--…)` ;
- la nomenclature des classes suit BEM strict `.app-{block}__{element}--{modifier}` — exemples concrets : `.app-flow__button--danger`, `.app-brand-mark--compact`, `.app-capture-result__hero-media--fallback`, `.app-detail__media--placeholder` ;
- les états d'UI utilisent la classe utility `.is-active` / `.is-busy` qui cohabite avec BEM (voir `App/components/app-tab-shell.mjs` ligne avec `${tab.id === activeTab ? ' is-active' : ''}`) ;
- chaque composant rend du HTML par template string depuis une fonction `renderXxxScreen({…} = {})` exportée — pas de JSX, pas de manipulation DOM impérative, pas de bundler ;
- toute donnée user-facing interpolée dans un template passe par `escapeHtml` ou `escapeAttribute` importés de `App/utils/rendering.mjs` ;
- les copies sont systématiquement en français (DRC) — exemples : `'Vendez en un clic'`, `'Toutes'`, `'Continuer mon brouillon'`, `'Acheter en confiance'`, `'Aucune annonce ne correspond à vos filtres.'` ;
- l'accessibilité repose sur `aria-label` (`'Recherche'`, `'Navigation principale'`), `aria-hidden="true"` sur les icônes décoratives, et `alt=""` sur les images décoratives.

Conséquence : Codex doit grep le repo à chaque nouvelle feature pour retrouver les bonnes variables, les bons préfixes, le bon pattern. Sur le run `home-header-beta-badge` (2026-05-21), Codex a heureusement reproduit la palette et BEM correctement parce que le plan citait les fichiers à lire — mais c'est fragile. Sans plan détaillé, sur une feature plus large, le risque de drift visuel (couleurs hard-codées, classes non-BEM, copies anglaises, oubli d'`escapeHtml`) est réel.

## Non-Goals

- Pas de refactoring de CSS, pas de migration vers Tailwind, pas de design system formel type Storybook.
- Pas de tokens JS générés depuis les variables CSS — la duplication coûte plus cher que ce que ça rapporte ici.
- Pas de couverture des conventions Flutter (`apps/mobile/`) ni des conventions admin (`apps/admin/`) — cette section est strictement pour `App/` (PWA). Les autres surfaces auront leurs propres sections si besoin futur.
- Pas d'ajout de règles de couverture de tests visuels (screenshots / Playwright visual diff) — c'est un autre chantier.
- Pas d'ajout de section dans `CLAUDE.md` dans le même plan — uniquement un pointer croisé, la synchronisation effective de `CLAUDE.md` est un travail séparé qui peut être déclenché plus tard.

## Existing System

`AGENTS.md` à la racine du repo, créé par le plan `2026-04-?` puis complété par le plan `2026-05-21-zwibba-agent-operating-briefs-implementation.md`. Structure actuelle (sept sections) :

1. "Project in one paragraph"
2. "Stack and toolchain"
3. "Repository layout you can rely on"
4. "The pair-document workflow you must follow"
5. "Execution rules for Codex" (huit règles, dont la #5 "Don't introduce framework or bundler dependencies in `App/`" et la #7 "French copy")
6. "Commands you'll actually run"
7. "Pointers across files"

La règle #7 "French copy" mentionne déjà brièvement la convention FR. La règle #5 mentionne le caractère framework-free de `App/`. Mais il n'existe aucune section dédiée qui détaille la palette, BEM, les helpers d'escape, ou les conventions ARIA.

`CLAUDE.md` est le pendant Claude-facing du même brief. Il vit dans le même répertoire et doit rester en sync avec `AGENTS.md` selon la règle énoncée dans "Pointers across files" : "if you find a discrepancy, the most recently edited one wins and the other must be updated".

Le fichier `src/site/styles.css` détient les déclarations `:root` canoniques (palette, radius tokens, shadows, layout max-width) consommées par `App/app.css` via `var(--…)`. C'est la source de vérité visuelle.

`App/utils/rendering.mjs` exporte `escapeHtml`, `escapeAttribute`, `formatCdf`, `formatListingPrice`. `escapeAttribute` est aujourd'hui un simple alias de `escapeHtml` mais le découplage est conservé pour permettre une divergence future.

## Recommended Architecture

### 1. Position de la nouvelle section dans `AGENTS.md`

Insérer la nouvelle section `## UX/UI conventions for App/` immédiatement après "Execution rules for Codex" (section 5) et avant "Commands you'll actually run" (section 6). C'est l'emplacement logique : les conventions UX sont une extension des règles d'exécution — elles s'appliquent quand Codex modifie ou ajoute du markup, des styles, des copies. Renuméroter implicitement (les sections n'ont pas de numérotation visible dans le markdown, juste l'ordre).

### 2. Cinq sous-blocs `###` qui couvrent les conventions extraites du code

Sous-bloc 2.1 — **Color palette and design tokens**. Lister les CSS variables exactes définies dans `src/site/styles.css` (palette texte, surfaces, brand, accents, radius, shadows, layout). Préciser que `App/app.css` les consomme via `var(--…)` et que toute nouvelle règle CSS dans `App/` doit faire de même au lieu de hard-coder des hex ou rgba. Donner deux exemples concrets : `background: var(--green-soft)` plutôt que `background: rgba(107, 230, 107, 0.12)` ; `border-radius: var(--radius-md)` plutôt que `border-radius: 22px`. Mentionner les seules valeurs hard-codées tolérées : le mobile nav height (`--app-mobile-nav-height: 88px` défini localement dans `App/app.css`).

Sous-bloc 2.2 — **BEM class naming**. Préfixe `.app-` obligatoire pour tout sélecteur `App/`. Structure stricte block-element-modifier : `.app-{block}`, puis `.app-{block}__{element}`, puis `.app-{block}--{modifier}` ou `.app-{block}__{element}--{modifier}`. Citer 4 exemples vivants déjà dans le code : `.app-flow__button--danger`, `.app-brand-mark--compact`, `.app-capture-result__hero-media--fallback`, `.app-detail__media--placeholder`. Les états transitoires (actif, busy, chargement, erreur) se gèrent avec les utility classes `.is-active`, `.is-busy`, `.is-loading`, `.is-error` qui cohabitent avec BEM dans le même attribut `class`.

Sous-bloc 2.3 — **Component structure**. Tout composant `App/` exporte une fonction `renderXxxScreen({...} = {})` (ou `renderXxx({...} = {})` pour les composants partagés) qui retourne une template string HTML. Pas de manipulation DOM impérative dans la fonction render — la logique de cycle de vie (events, scroll, fetch) vit dans les contrôleurs (`App/features/*/...controller.mjs`) et services (`App/services/`). Les options de la fonction render ont toutes des defaults via destructuring `{...} = {}` pour permettre l'appel sans argument dans les tests. La fonction render est pure : elle ne touche pas le DOM, ne fait pas d'I/O. Citer comme exemple `renderAppTabShell({ activeTab = 'sell', content = '', unreadMessagesCount = 0 } = {})` dans `App/components/app-tab-shell.mjs`.

Sous-bloc 2.4 — **HTML escaping and ARIA**. Toute interpolation de donnée non-statique dans une template string doit passer par `escapeHtml` (pour le texte) ou `escapeAttribute` (pour les valeurs d'attributs), tous deux importés de `App/utils/rendering.mjs`. Pas d'exception — même les ID, les noms de catégorie, les compteurs numériques. Accessibilité : `aria-label` obligatoire sur les interactions sans texte visible (boutons icône, inputs sans label visible — voir `App/features/home/home-screen.mjs` ligne avec `aria-label="Recherche"`) ; `aria-hidden="true"` sur les icônes purement décoratives ; `alt=""` (vide, pas omis) sur les images décoratives ; `<nav aria-label="…">` sur toute nav (voir `App/components/app-tab-shell.mjs`). Les `data-*` attributes (`data-action`, `data-category-id`, `data-tab-id`) sont le canal canonique pour qu'un contrôleur cible un élément — éviter les ID `id="…"` sauf nécessité.

Sous-bloc 2.5 — **Mobile-first FR**. Toute copie user-facing est en français (DRC). Les chaînes anglaises ne sont tolérées que pour des debug tokens internes (data attributes, console.log). Le layout est mobile-first : les styles desktop viennent en `@media` au-dessus d'un breakpoint, pas l'inverse. Les composants ne supposent pas de hover (l'app cible des téléphones tactiles) — les états interactifs reposent sur `:active` et `is-active`, pas sur `:hover`. La hauteur de viewport est précieuse : éviter les marges verticales gratuites, viser une densité d'information élevée dès le premier viewport (cf. plan `2026-03-22-zwibba-browser-phone-shell-refresh-design.md`).

### 3. Pointer croisé avec `CLAUDE.md`

À la fin de la nouvelle section, ajouter un paragraphe court qui rappelle la règle de sync déjà énoncée dans "Pointers across files" : si cette section est modifiée, la section équivalente de `CLAUDE.md` doit être mise à jour dans le même commit ou un commit immédiatement suivant. Ne pas créer la section dans `CLAUDE.md` dans ce plan — c'est explicitement hors scope (voir Non-Goals).

### 4. Format et longueur

La nouvelle section doit rester compacte (cible 60-90 lignes de markdown) pour ne pas noyer le reste d'`AGENTS.md`. Chaque sous-bloc fait 8-15 lignes. Les exemples sont des citations littérales courtes (max ~15 mots) issues du code — pas de blocs de code volumineux qui dupliqueraient le contenu source. Style : prose dense, voix active, ton instructif comme le reste d'`AGENTS.md`.

### 5. Couverture par test

Ajouter un test léger dans `tests/agents-md.test.mjs` (nouveau fichier) qui assert que `AGENTS.md` contient la section `## UX/UI conventions for App/` et au moins une référence textuelle aux concepts clés : la chaîne `var(--green)`, la chaîne `escapeHtml`, la chaîne `aria-label`, la chaîne `mobile-first`. C'est un test de présence, pas de qualité — il garantit juste que la section ne disparaît pas par erreur lors d'une future édition.
