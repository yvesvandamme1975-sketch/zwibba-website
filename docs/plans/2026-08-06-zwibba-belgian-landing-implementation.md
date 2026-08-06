# Zwibba Belgian Landing (P5) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Vitrines `/be/` (fr-BE) et `/be/nl/` (nl-BE) émises depuis les modules P4, hreflang + sitemap multi-locale, sélecteur de langue, bannière géo sur la racine, prix EUR corrects sur les OG d'annonces dynamiques.

**Architecture:** Helper `localeHref(site, path)` dans les templates ; `build()` → boucle `buildLocale` sur `[fr-cd, fr-be, nl-be]` (assets/App émis une fois) ; alternates hreflang croisés par chemin logique ; sitemap agrégé ; bannière géo dans `src/site/app.js` via le cookie `zwibba_geo` existant ; `buildListingOgTags` devise-aware.

**Tech Stack:** Vanilla JS ESM, node:test (`--test-concurrency=1` — la suite a une course pré-existante sur `dist/` partagé ; une défaillance isolée non liée se revérifie par un simple re-run).

**Garde transverse :** baseline P4 à `/tmp/zwibba-dist-baseline-p5`. À chaque task, `diff -r --exclude=sw.js /tmp/zwibba-dist-baseline-p5 dist` limité aux différences sanctionnées par la task (les inventorier dans le rapport). L'App reste hors périmètre.

---

### Task 1: Indexer la paire de plans

**Files:**
- Modify: `docs/plans/README.md`

1. Ajouter `2026-08-06-zwibba-belgian-landing-design.md` / `-implementation.md` en fin de liste (fichiers présents non commités — même commit).
2. `grep belgian-landing docs/plans/README.md` → deux lignes.
3. Commit : `git commit -m "docs: index belgian-landing plans"`

### Task 2: localeHref — préfixage des hrefs internes (sortie inchangée)

**Files:**
- Modify: `scripts/build.mjs` (tous les hrefs internes vitrine : nav, footer, brandmark, cartes annonces, CTA « Explorer »/« Devenir ambassadeur », liens `/annonce/<slug>/`, `currentPath`/`canonicalPath` passés aux pages, `resolveUrl`)
- Test: `tests/locale-href.test.mjs` (nouveau)

1. Test qui échoue : `localeHref` exporté (ou testé via build) — avec un `site.urlPrefix: ''` les hrefs de `dist/index.html` sont inchangés ; test unitaire de `localeHref({urlPrefix: '/be'}, '/annonces/') === '/be/annonces/'` (exporter le helper depuis `scripts/build.mjs` ou un petit `src/site/locale-href.mjs` importé par le build — préférer ce dernier, testable proprement).
2. Implémenter : créer `src/site/locale-href.mjs` (`export function localeHref(site, path) { return `${site.urlPrefix ?? ''}${path}`; }`) ; remplacer chaque href interne vitrine par `localeHref(site, '/…')` ; `resolveUrl(site, path)` intègre le préfixe pour les canonicals/sitemap. Ne PAS toucher les hrefs d'assets (`/assets/…`, `/App/…`) ni la page App.
3. Vérifier : `node --test tests/*.test.mjs --test-concurrency=1` tout vert ; `diff -r --exclude=sw.js /tmp/zwibba-dist-baseline-p5 dist` → **aucune différence**.
4. Commit : `git commit -m "refactor(build): thread locale url prefix through internal links"`

### Task 3: Boucle buildLocale — émission /be/ et /be/nl/

**Files:**
- Modify: `scripts/build.mjs` (`build()` → boucle ; sections dépendantes des annonces conditionnées par `listings.length`)
- Test: `tests/build-locales.test.mjs` (nouveau)

1. Tests qui échouent : après build, `dist/be/index.html` existe (français belge : contient « Belgique », `lang="fr"`, `og:locale` `fr_BE`, AUCUNE occurrence « Lubumbashi ») ; `dist/be/nl/index.html` existe (`lang="nl"`, contient « zoekertjes ») ; `dist/be/annonces/index.html` contient le `resultsFallback` fr-be et zéro carte d'annonce ; il n'existe AUCUN `dist/be/annonce/` (pas de pages annonces statiques BE) ; les hrefs internes de `dist/be/nl/index.html` commencent par `/be/nl/` ; `dist/be/assets/` n'existe PAS (assets uniquement racine).
2. Implémenter : extraire le corps de `build()` en `buildLocale(localeModule)` retournant ses `pages` ; boucler sur `[frCd, frBe, nlBe]` (imports statiques) ; écrire chaque page sous `path.join(distDir, site.urlPrefix, page.file)` ; assets/App/manifest/robots écrits une seule fois (locale racine) ; grille d'annonces de l'accueil, section « annonces » et pages `/annonce/…` statiques omises quand `listings.length === 0` (page annonces rendue avec fallback) ; `formatPrice` déjà locale-aware (P4).
3. Vérifier : tests verts ; diff → seules différences : les NOUVEAUX répertoires `dist/be/**` (racine inchangée octet pour octet).
4. Commit : `git commit -m "feat(site): emit belgian french and dutch landing trees"`

### Task 4: hreflang + sitemap multi-locale

**Files:**
- Modify: `scripts/build.mjs` (`renderLayout` alternates ; `buildSitemap` agrégé)
- Test: `tests/build-locales.test.mjs` (compléter)

1. Tests qui échouent : `dist/index.html` contient `<link rel="alternate" hreflang="fr" href="https://zwibba.com/" />`, `hreflang="fr-BE" href="https://zwibba.com/be/"`, `hreflang="nl-BE" href="https://zwibba.com/be/nl/"`, `hreflang="x-default" href="https://zwibba.com/"` ; `dist/be/nl/annonces/index.html` porte les alternates du chemin `/annonces/` des trois locales ; `dist/sitemap.xml` contient `/be/` et `/be/nl/annonces/` mais PAS `/be/annonce/…` ; un seul sitemap (racine).
2. Implémenter : `renderLayout` reçoit le chemin logique (chemin sans préfixe) et émet les 4 alternates en croisant les préfixes des trois locales (uniquement pour les pages existant dans les trois arbres — les pages `/annonce/…` fr-CD n'émettent pas d'alternates BE) ; `buildSitemap` reçoit la liste concaténée des pages des trois locales.
3. Vérifier : tests verts ; diff : racine — seuls ajouts, les balises alternate + les nouvelles entrées sitemap ; `/be/**` conformes.
4. Commit : `git commit -m "feat(site): add hreflang alternates and multi-locale sitemap"`

### Task 5: Sélecteur de langue (footer) + bannière géo racine

**Files:**
- Modify: `src/site/locales/fr-cd.mjs`, `fr-be.mjs`, `nl-be.mjs` (`ui.nav.localeSwitch` : labels des 3 versions ; `ui.client.geoBanner` : texte + CTA + fermeture)
- Modify: `scripts/build.mjs` (`renderFooter` : liens des 3 versions vers la page équivalente)
- Modify: `src/site/app.js` (bannière géo : cookie `zwibba_geo` === 'BE' + pas de `localStorage zwibba_site_country` → bannière avec lien `/be/` et bouton fermer qui persiste `'CD'` ; cliquer le lien persiste `'BE'`)
- Test: `tests/build-locales.test.mjs` + `tests/locale-parity.test.mjs` restent verts (nouvelles clés dans les 3 locales !), + assertions footer/banner

1. Tests qui échouent : le footer de `dist/index.html` contient des liens vers `/be/` et `/be/nl/` ; celui de `dist/be/nl/annonces/index.html` vers `/annonces/` et `/be/annonces/` ; `dist/index.html` contient le conteneur/données de la bannière géo (rendue par JS — vérifier que `ZWIBBA_UI_STRINGS` contient `geoBanner`) ; parité : les 3 locales portent les nouvelles clés.
2. Implémenter (bannière : injectée par `app.js` au chargement sur les pages SANS préfixe uniquement — détecter via `ZWIBBA_UI_STRINGS.geoBanner.isRoot` ou l'absence de préfixe dans `location.pathname`, choisir le plus simple et le documenter ; styles réutilisant les patterns bannière existants du site).
3. Vérifier : tout vert (`--test-concurrency=1`), diff sanctionné (footer + UI_STRINGS enrichi), parité verte.
4. Commit : `git commit -m "feat(site): add locale switcher and belgian geo suggestion banner"`

### Task 6: OG d'annonces dynamiques — prix par devise

**Files:**
- Modify: `shared/listing-og.mjs`
- Test: le test existant de ce module (grep `listing-og` dans `tests/`) — compléter

1. Tests qui échouent : `buildListingOgTags` avec `priceCurrency: 'EUR'`, `priceAmount: 250` → le titre/description OG contient `250 €` (format `fr-BE`) ; avec `'USD'` → `US$` ; sans devise → comportement CDF actuel inchangé.
2. Implémenter : remplacer le formatage `fr-FR`+CDF en dur par une petite fonction devise-aware alignée sur `formatListingPrice` de l'API (EUR → suffixe « € », USD → « US$ », CDF défaut ; `priceAmount === 0` → « À donner » si c'est le comportement actuel — vérifier).
3. Vérifier : `node --test tests/*.test.mjs --test-concurrency=1` tout vert ; `node scripts/build.mjs` exit 0 ; `npm run smoke:monorepo` exit 0.
4. Commit : `git commit -m "feat(og): format dynamic listing prices per currency"`
