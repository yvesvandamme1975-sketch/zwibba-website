# Zwibba Landing i18n Foundation (P4) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Toute la copie de la vitrine sort vers des modules de locale (`src/site/locales/{fr-cd,fr-be,nl-be}.mjs`), pipeline de rendu paramétré, sortie `dist/` racine inchangée (hors correction documentée du filtre état), traductions fr-BE et nl-BE prêtes pour P5.

**Architecture:** Modules de locale miroirs de `content.mjs` + export `ui` pour les ~170 chaînes de template ; fonctions de rendu de `scripts/build.mjs` paramétrées par un objet `content` ; chaînes d'`app.js` injectées via `window.ZWIBBA_UI_STRINGS` ; test de parité structurelle inter-locales.

**Tech Stack:** Vanilla JS ESM, node:test, diff récursif de `dist/` comme garde de non-régression.

**Règle transverse :** l'App PWA (`renderAppPage`, `renderManifest`, tout `App/`) reste française et NON paramétrée. `tests/build.test.mjs` doit rester vert **sans modification** à chaque task (ses assertions portent sur les libellés, qui ne changent pas), sauf mention explicite.

---

### Task 1: Indexer la paire de plans

**Files:**
- Modify: `docs/plans/README.md`

1. Ajouter `2026-08-06-zwibba-landing-i18n-design.md` / `-implementation.md` à la fin de la liste (fichiers déjà présents non commités — même commit).
2. `grep landing-i18n docs/plans/README.md` → deux lignes.
3. Commit : `git commit -m "docs: index landing-i18n plans"`

### Task 2: Module fr-CD + garde de non-régression

**Files:**
- Create: `src/site/locales/fr-cd.mjs`
- Modify: `src/site/content.mjs` (devient un ré-export)
- Test: `tests/locale-fr-cd.test.mjs`

1. Construire la référence AVANT tout changement : `node scripts/build.mjs && cp -r dist /tmp/zwibba-dist-baseline`.
2. Test qui échoue : `tests/locale-fr-cd.test.mjs` importe `src/site/locales/fr-cd.mjs` et vérifie que ses exports (`site`, `categories`, `featureSteps`, `platformHighlights`, `testimonials`, `faqs`, `aboutValues`, `supportTopics`, `ambassadorChannels`, `listings`) sont `deepStrictEqual` aux exports de `src/site/content.mjs`, et que `site` porte EN PLUS : `htmlLang: 'fr'`, `ogLocale: 'fr_CD'` (=== l'actuel `site.locale`), `market: 'CD'`, `language: 'fr'`, `currency: 'CDF'`, `priceLocale: 'fr-FR'`, `urlPrefix: ''`.
3. Implémenter : déplacer le contenu de `content.mjs` dans `locales/fr-cd.mjs` (en enrichissant `site` des nouveaux champs, `locale` conservé pour compat) ; `content.mjs` devient `export * from './locales/fr-cd.mjs';` (+ ré-export par défaut si utilisé).
4. Vérifier : tests verts, `node scripts/build.mjs && diff -r /tmp/zwibba-dist-baseline dist` → **aucune différence**.
5. Commit : `git commit -m "refactor(site): move landing content into fr-cd locale module"`

### Task 3: Paramétrer le pipeline de rendu (sortie identique)

**Files:**
- Modify: `scripts/build.mjs` (toutes les fonctions de rendu vitrine + `build()`)

1. Remplacer la consommation des imports de module par un paramètre `content` : chaque `renderXPage(...)` vitrine (layout, nav, footer, landing, browse, listing, ambassador, about, contact, referral, sitemap/robots via la liste de pages) reçoit/destructure `content` (`{ site, categories, listings, faqs, ... }`). `build()` importe `fr-cd.mjs` une fois et le thread partout. `renderAppPage`/`renderManifest` gardent leurs imports actuels (App hors périmètre).
2. AUCUN changement de chaîne dans cette task — pur déplacement de plomberie.
3. Vérifier : `node --test tests/*.test.mjs` tout vert ; `node scripts/build.mjs && diff -r /tmp/zwibba-dist-baseline dist` → **aucune différence**.
4. Commit : `git commit -m "refactor(build): thread locale content through landing render pipeline"`

### Task 4: Export ui — layout, landing, referral, ambassador, about

**Files:**
- Modify: `src/site/locales/fr-cd.mjs` (nouvel export `ui`, première moitié)
- Modify: `scripts/build.mjs` (`renderLayout`, `renderNav`, `renderFooter`, dialogue gate, `renderLandingPage`, `renderReferralPage`, `renderAmbassadorPage`, `renderAboutPage`)
- Test: `tests/locale-ui.test.mjs` (nouveau)

1. Test qui échoue : `ui` exporté par fr-cd contient les clés `nav`, `gate`, `landing`, `referral`, `ambassador`, `about` avec les chaînes actuelles (échantillonner ~10 assertions exactes, ex. `ui.nav.explore === 'Explorer'`, `ui.gate.title`…).
2. Extraire les chaînes inline de ces fonctions vers `ui.*` (y compris : skip-link, sr-only, aria-labels, les 3 étapes « Comment ça marche » inline de l'ambassadeur et les 3 note-cards de l'à-propos — promues en tableaux dans le module). Les fonctions lisent `content.ui`.
3. Vérifier : tests verts (y compris `tests/build.test.mjs` inchangé) ; `diff -r /tmp/zwibba-dist-baseline dist` → aucune différence.
4. Commit : `git commit -m "refactor(site): extract layout and page chrome strings into locale ui"`

### Task 5: Export ui — browse, listing, contact + fix filtre état

**Files:**
- Modify: `src/site/locales/fr-cd.mjs` (`ui.browse` avec `conditions: [{code,label}]`, `ui.listing`, `ui.safetyTips`, `ui.contact`)
- Modify: `scripts/build.mjs` (`renderBrowsePage`, `renderListingPage`, `renderContactPage`, `safetyTips` supprimé du build)
- Modify: `src/site/app.js` (`matchesFilters` : comparaison par `code`)
- Test: `tests/locale-ui.test.mjs` (compléter) + vérifier `tests/build.test.mjs`

1. Tests qui échouent : `ui.browse.conditions` est une liste de `{code, label}` (codes stables ascii : `neuf`, `tres-bon-etat`, `bon-etat`, `correct`, `pour-pieces` — dériver du libellé actuel) ; le HTML de `dist/annonces/index.html` porte `value="tres-bon-etat"` (plus le libellé brut) tout en affichant les mêmes libellés français.
2. Extraire ; les cartes annonces émettent `data-condition="<code>"` (slug du libellé de `listing.condition` via une petite fonction `conditionCode()` partagée build/app.js — dupliquée localement dans app.js, pas de bundler) ; `matchesFilters` compare les codes.
3. Vérifier : `node --test tests/*.test.mjs` tout vert ; `diff -r /tmp/zwibba-dist-baseline dist` → **seules différences attendues : attributs `value=` du select état et `data-condition` des cartes** (les lister dans le rapport). `tests/build.test.mjs` reste vert sans modification (il n'asserte pas ces attributs — vérifier ; s'il le fait, adapter en citant la ligne).
4. Commit : `git commit -m "refactor(site): extract browse and listing strings, decouple condition codes"`

### Task 6: Chaînes app.js injectées + prix/lang/schema paramétrés

**Files:**
- Modify: `scripts/build.mjs` (injection `window.ZWIBBA_UI_STRINGS` dans les pages vitrine ; `formatCdf` → `formatPrice(site, amount)` ; `<html lang="${site.htmlLang}">` dans `renderLayout` ; `priceCurrency: site.currency` dans les JSON-LD ; description du schema `CollectionPage` partagée avec la meta description via une constante)
- Modify: `src/site/app.js` (lecture `window.ZWIBBA_UI_STRINGS` avec replis français actuels, pluriel via `new Intl.PluralRules(lang)`)
- Modify: `src/site/locales/fr-cd.mjs` (`ui.client` : toasts, annonceur menu, prompt, labels mailto, gabarit résumé `{count}`)
- Test: `tests/locale-ui.test.mjs` (compléter) + `tests/build.test.mjs` doit rester vert

1. Tests qui échouent : `dist/index.html` contient `window.ZWIBBA_UI_STRINGS` avec `ui.client` sérialisé ; `dist/annonces/index.html` conserve `lang="fr"` et le prix formaté actuel (inchangés pour fr-CD).
2. Implémenter — comportement fr-CD strictement identique (`formatPrice` avec `site.priceLocale='fr-FR'`, `site.currency='CDF'` reproduit `formatCdf`).
3. Vérifier : tous tests verts ; `diff -r /tmp/zwibba-dist-baseline dist` → seules différences : le bloc `ZWIBBA_UI_STRINGS` ajouté + les attributs de la Task 5.
4. Commit : `git commit -m "refactor(site): inject client ui strings and parameterize price, lang and schema"`

### Task 7: Locales fr-BE et nl-BE + test de parité

**Files:**
- Create: `src/site/locales/fr-be.mjs`, `src/site/locales/nl-be.mjs`
- Test: `tests/locale-parity.test.mjs`

1. Test qui échoue : pour chaque locale `['fr-be', 'nl-be']`, le module s'importe, expose exactement les mêmes exports nommés que fr-cd, et récursivement les mêmes clés/formes d'objets (fonction utilitaire comparant les arbres de clés, tableaux comparés par longueur SAUF `listings` : `[]` accepté) ; `site` de fr-be = `{market:'BE', language:'fr', htmlLang:'fr', ogLocale:'fr_BE', currency:'EUR', priceLocale:'fr-BE', urlPrefix:'/be'}` ; nl-be = `{market:'BE', language:'nl', htmlLang:'nl', ogLocale:'nl_BE', currency:'EUR', priceLocale:'nl-BE', urlPrefix:'/be/nl'}`.
2. Créer les deux modules : copie de fr-cd adaptée. fr-BE : français adapté au marché belge (retirer les références Lubumbashi/RDC du texte structurel, « petites annonces en Belgique », prix en euros dans les exemples, catégories identiques) ; nl-BE : traduction néerlandaise complète (site, nav, categories label+hint, featureSteps, platformHighlights, faqs, aboutValues, supportTopics, testimonials adaptés, tout `ui`). `listings: []` dans les deux. En tête de chaque module : `// TRADUCTION GÉNÉRÉE — relecture par un locuteur natif requise avant lancement public.`
3. Vérifier : `node --test tests/*.test.mjs` tout vert ; `node scripts/build.mjs` → exit 0 et `diff -r` inchangé (les nouveaux modules ne sont pas encore consommés par le build — c'est P5) ; `npm run smoke:monorepo` → exit 0.
4. Commit : `git commit -m "feat(site): add fr-be and nl-be locale modules with parity test"`
