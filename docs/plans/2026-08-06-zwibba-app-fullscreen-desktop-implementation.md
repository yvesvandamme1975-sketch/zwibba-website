# Zwibba App Fullscreen Desktop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Supprimer la maquette téléphone et le chrome marketing de `/App/` pour que l'app occupe toute la hauteur du navigateur en colonne centrée (Phase A), puis, à ≥920px, élargir la coquille, passer le feed acheteur en grille fluide multi-colonnes et élargir la fiche annonce, les autres écrans restant contraints en colonne lisible (Phase B).

**Architecture:** Deux fichiers portent tout le changement : `scripts/build.mjs` (`renderAppPage()` ne rend plus que `main.app-standalone > .app-shell > .app-shell__viewport[data-app-root]`) et `App/app.css` (suppression des règles du cadre téléphone/note/topbar, `.app-shell` pleine hauteur `100dvh` en colonne `min(100%, 520px)`, nouvelle media query `(min-width: 920px)` avec coquille 1080px, garde-fou `max-width: 640px` sur `.app-screen`/`.app-flow`, exceptions `.app-screen--home` et `.app-flow--detail`, grille `auto-fill` du feed). Le comportement mobile `(max-width: 640px)` existant (scroll de page, nav fixée en bas) est intégralement conservé. Les tests regex `tests/app-shell-ui.test.mjs` et `tests/app-entry-copy.test.mjs` sont adaptés en premier (TDD).

**Tech Stack:** Vanilla JS ESM sans bundler (`App/`, `scripts/build.mjs`), CSS pur (`App/app.css`), runner `node --test` (`tests/*.test.mjs`), smoke `npm run smoke:app`.

**Base branch:** partir de la pointe applicative courante (`codex/geo-country-suggestion`, ou le trunk `codex/website-vitrine-backup` une fois les PR #39/#40 fusionnées) sur une branche `codex/app-fullscreen-desktop`. Ne jamais viser `main` (landing seule).

---

### Task 1: Indexer la paire de plans

**Files:**
- Create: `docs/plans/2026-08-06-zwibba-app-fullscreen-desktop-design.md` (copie depuis `.zwibba-plan-staging/`)
- Create: `docs/plans/2026-08-06-zwibba-app-fullscreen-desktop-implementation.md` (copie depuis `.zwibba-plan-staging/`)
- Modify: `docs/plans/README.md`

- [ ] **Step 1: Copier la paire et l'indexer**

Copier les deux documents de `.zwibba-plan-staging/` vers `docs/plans/`, puis ajouter à la liste des docs actifs de `docs/plans/README.md`, après la dernière entrée existante :

```
- `2026-08-06-zwibba-app-fullscreen-desktop-design.md`
- `2026-08-06-zwibba-app-fullscreen-desktop-implementation.md`
```

- [ ] **Step 2: Vérifier**

Run: `rg -n "app-fullscreen-desktop" docs/plans/README.md docs/plans/ -l`
Expected: le README et les deux nouveaux fichiers apparaissent.

- [ ] **Step 3: Commit**

```bash
git add docs/plans/
git commit -m "docs: index app fullscreen desktop plan pair"
```

---

### Task 2: Phase A — la page /App/ devient l'app seule (markup)

**Files:**
- Modify: `tests/app-entry-copy.test.mjs`
- Modify: `scripts/build.mjs` (fonction `renderAppPage()`, corps `<body>` lignes ~300–332)

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/app-entry-copy.test.mjs`, remplacer le test existant `'public App shell uses beta/live copy instead of prototype wording'` par :

```js
test('public App shell uses beta/live copy instead of prototype wording', async () => {
  buildSite();

  const html = await readBuiltAppEntry();

  assert.doesNotMatch(html, /Prototype vendeur/i);
  assert.doesNotMatch(html, /App mobile, version navigateur/i);
  assert.doesNotMatch(html, /Ouvrir le prototype/i);
  assert.match(html, /B[êe]ta/i);
});

test('public App entry is the bare app shell without marketing chrome', async () => {
  buildSite();

  const html = await readBuiltAppEntry();

  assert.doesNotMatch(html, /app-standalone__topbar/);
  assert.doesNotMatch(html, /app-standalone__note/);
  assert.doesNotMatch(html, /app-standalone__frame/);
  assert.doesNotMatch(html, /app-standalone__entry/);
  assert.doesNotMatch(html, /Ouvrir l'app/i);
  assert.doesNotMatch(html, /Retour au site/i);
  assert.match(html, /class="app-shell__viewport"[^>]*data-app-root/i);
});
```

Note : l'assertion `/B[êe]ta/i` reste satisfaite par la meta description (« Bêta web Zwibba… »), qui ne bouge pas.

- [ ] **Step 2: Vérifier l'échec**

Run: `node --test tests/app-entry-copy.test.mjs`
Expected: FAIL — le HTML construit contient encore `app-standalone__topbar`, `Ouvrir l'app`, etc.

- [ ] **Step 3: Implémenter**

Dans `scripts/build.mjs`, `renderAppPage()`, remplacer tout le contenu du `<body>` entre `<a class="skip-link" ...>` et le premier `<script>` (c'est-à-dire la topbar, la section `app-standalone__entry` avec la note et le cadre) par :

```html
    <main class="app-standalone" id="main-content">
      <div class="app-shell">
        <div class="app-shell__viewport" data-app-root data-screen="home"></div>
      </div>
    </main>
```

Le `skip-link`, les meta/OG, les liens fonts/manifest et les trois `<script>` de fin (API base URL, module app.js, service worker) sont inchangés.

- [ ] **Step 4: Vérifier le succès**

Run: `node --test tests/app-entry-copy.test.mjs tests/build.test.mjs`
Expected: PASS (build.test.mjs confirme que `app-shell__viewport` + `data-app-root` sont toujours présents).

- [ ] **Step 5: Commit**

```bash
git add tests/app-entry-copy.test.mjs scripts/build.mjs
git commit -m "feat(app): serve the bare app shell on /App/ without marketing chrome"
```

---

### Task 3: Phase A — colonne app pleine hauteur (CSS)

**Files:**
- Modify: `tests/app-shell-ui.test.mjs`
- Modify: `App/app.css`

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/app-shell-ui.test.mjs` :

1. Supprimer ces trois tests devenus obsolètes (le markup qu'ils couvrent n'existe plus) :
   - `'mobile app shell hides the standalone marketing note so the app starts first'`
   - `'mobile app shell hides the standalone topbar so the app opens without site chrome'`
   - `'desktop shell gives more space to the phone and less to the landing copy'`
2. Ajouter à la place :

```js
test('app shell fills the viewport height as a centered column', () => {
  assert.match(
    appStyles,
    /\.app-shell\s*\{[\s\S]*?width:\s*min\(100%,\s*520px\);[\s\S]*?margin:\s*0 auto;[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;/,
  );
});

test('phone mockup and marketing chrome styles are removed', () => {
  assert.doesNotMatch(appStyles, /\.app-standalone__frame/);
  assert.doesNotMatch(appStyles, /\.app-standalone__note/);
  assert.doesNotMatch(appStyles, /\.app-standalone__topbar/);
  assert.doesNotMatch(appStyles, /\.app-standalone__brand/);
  assert.doesNotMatch(appStyles, /\.app-standalone__entry/);
});
```

Les autres tests du fichier (chips actives, scroll interne desktop, libération du scroll mobile, nav fixée mobile) restent inchangés — ils protègent le comportement qu'on conserve.

- [ ] **Step 2: Vérifier l'échec**

Run: `node --test tests/app-shell-ui.test.mjs`
Expected: FAIL — `App/app.css` contient encore `.app-standalone__frame` et `.app-shell` n'a pas `100dvh`.

- [ ] **Step 3: Implémenter**

Dans `App/app.css` :

1. Remplacer la règle `.app-standalone` (lignes ~9–15) par :

```css
.app-standalone {
  position: relative;
  z-index: 1;
  width: 100%;
  margin: 0 auto;
  padding: 0;
}
```

2. Supprimer intégralement les règles `.app-standalone__topbar`, `.app-standalone__brand`, `.app-standalone__brand img`, `.app-standalone__brand-copy`, `.app-standalone__brand-copy strong`, `.app-standalone__brand-copy span`, `.app-standalone__entry`, `.app-standalone__note`, `.app-standalone__note h1`, `.app-standalone__note p`, `.app-standalone__frame`, `.app-standalone__frame::before` (lignes ~17–93).

3. Remplacer la règle `.app-shell` (lignes ~95–107) par :

```css
.app-shell {
  display: flex;
  flex-direction: column;
  width: min(100%, 520px);
  margin: 0 auto;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(107, 230, 107, 0.12), transparent 28%),
    linear-gradient(180deg, #1c1e22 0%, #15171a 100%);
  border-inline: 1px solid rgba(255, 255, 255, 0.06);
}
```

4. Supprimer le bloc `@media (min-width: 920px)` existant (grille `app-standalone__entry`, lignes ~1603–1609) et le bloc `@media (max-width: 919px)` (centrage du cadre, lignes ~1611–1615).

5. Dans le bloc `@media (max-width: 640px)`, supprimer uniquement les règles `.app-standalone { … }`, `.app-standalone__topbar { display: none; }`, `.app-standalone__entry { … }`, `.app-standalone__note { display: none; }`, `.app-standalone__frame { … }` et `.app-standalone__frame::before { … }`. Conserver telles quelles les règles `.app-shell`, `.app-shell__viewport`, `.app-tab-shell`, `.app-tab-shell__content`, `.app-tab-shell__nav` de ce bloc (dont `border-left: 0; border-right: 0;` qui neutralise `border-inline` sur mobile).

- [ ] **Step 4: Vérifier le succès**

Run: `node --test tests/app-shell-ui.test.mjs tests/app-entry-copy.test.mjs tests/build.test.mjs`
Expected: PASS.

- [ ] **Step 5: Vérification Phase A complète**

Run: `node --test tests/*.test.mjs && npm run smoke:app`
Expected: suite entièrement verte + `smoke:app` OK. Contrôle visuel : `npm run build && npx serve dist -l 4173` puis vérifier `http://localhost:4173/App/` à 1280px et 1680px (app pleine hauteur, colonne centrée 520px, aucune maquette) et à 375px (comportement mobile identique à avant : nav fixée en bas, scroll de page).

- [ ] **Step 6: Commit**

```bash
git add tests/app-shell-ui.test.mjs App/app.css
git commit -m "feat(app): full-height centered app column instead of phone mockup"
```

---

### Task 4: Phase B — coquille élargie et garde-fou par écran à ≥920px

**Files:**
- Modify: `tests/app-shell-ui.test.mjs`
- Modify: `App/app.css`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `tests/app-shell-ui.test.mjs` :

```js
test('desktop widens the shell and constrains screens to a readable column', () => {
  assert.match(
    appStyles,
    /@media \(min-width: 920px\) \{[\s\S]*?\.app-shell\s*\{[\s\S]*?width:\s*min\(100%,\s*1080px\);/,
  );
  assert.match(
    appStyles,
    /@media \(min-width: 920px\) \{[\s\S]*?\.app-screen,\s*\.app-flow\s*\{[\s\S]*?max-width:\s*640px;[\s\S]*?margin-inline:\s*auto;/,
  );
  assert.match(
    appStyles,
    /@media \(min-width: 920px\) \{[\s\S]*?\.app-screen--home\s*\{[\s\S]*?max-width:\s*none;/,
  );
  assert.match(
    appStyles,
    /@media \(min-width: 920px\) \{[\s\S]*?\.app-flow--detail\s*\{[\s\S]*?max-width:\s*760px;/,
  );
});

test('desktop keeps the tab nav compact and centered', () => {
  assert.match(
    appStyles,
    /@media \(min-width: 920px\) \{[\s\S]*?\.app-tab-shell__nav\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*110px\)\);[\s\S]*?justify-content:\s*center;/,
  );
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `node --test tests/app-shell-ui.test.mjs`
Expected: FAIL — aucun bloc `@media (min-width: 920px)` dans `App/app.css` (supprimé en Task 3).

- [ ] **Step 3: Implémenter**

À la fin de `App/app.css`, ajouter un nouveau bloc :

```css
@media (min-width: 920px) {
  .app-shell {
    width: min(100%, 1080px);
  }

  .app-screen,
  .app-flow {
    width: 100%;
    max-width: 640px;
    margin-inline: auto;
  }

  .app-screen--home {
    max-width: none;
  }

  .app-flow--detail {
    max-width: 760px;
  }

  .app-tab-shell__nav {
    grid-template-columns: repeat(5, minmax(0, 110px));
    justify-content: center;
  }
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `node --test tests/app-shell-ui.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/app-shell-ui.test.mjs App/app.css
git commit -m "feat(app): widen desktop shell with per-screen readable column guard"
```

---

### Task 5: Phase B — feed en grille et fiche annonce élargie

**Files:**
- Modify: `tests/app-shell-ui.test.mjs`
- Modify: `App/app.css` (dans le bloc `@media (min-width: 920px)` créé en Task 4)

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `tests/app-shell-ui.test.mjs` :

```js
test('desktop feed becomes a fluid multi-column grid', () => {
  assert.match(
    appStyles,
    /@media \(min-width: 920px\) \{[\s\S]*?\.app-home__recent-feed\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(240px,\s*1fr\)\);/,
  );
  assert.match(
    appStyles,
    /@media \(min-width: 920px\) \{[\s\S]*?\.app-home__featured-row\s*\{[\s\S]*?grid-auto-columns:\s*260px;/,
  );
});

test('desktop listing detail gets a taller primary photo', () => {
  assert.match(
    appStyles,
    /@media \(min-width: 920px\) \{[\s\S]*?\.app-flow--detail \.app-detail__media,\s*\.app-flow--detail \.app-detail__image\s*\{[\s\S]*?min-height:\s*380px;/,
  );
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `node --test tests/app-shell-ui.test.mjs`
Expected: FAIL — les règles feed/detail n'existent pas encore dans le bloc ≥920px.

- [ ] **Step 3: Implémenter**

Dans le bloc `@media (min-width: 920px)` de `App/app.css`, ajouter après la règle `.app-tab-shell__nav` :

```css
  .app-home__recent-feed {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }

  .app-home__featured-row {
    grid-auto-columns: 260px;
  }

  .app-flow--detail .app-detail__media,
  .app-flow--detail .app-detail__image {
    min-height: 380px;
  }
```

- [ ] **Step 4: Vérifier le succès**

Run: `node --test tests/app-shell-ui.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/app-shell-ui.test.mjs App/app.css
git commit -m "feat(app): desktop feed grid and wider listing detail"
```

---

### Task 6: Vérification finale

**Files:** aucun (vérification seulement).

- [ ] **Step 1: Suite complète + smoke**

Run: `node --test tests/*.test.mjs && npm run smoke:app`
Expected: tous les tests PASS, `smoke:app` OK. Si un test hors périmètre échoue (p. ex. une assertion oubliée sur le HTML de `/App/` dans `tests/internal-beta-assets.test.mjs`), s'arrêter, lire le test, et corriger la cause — ne jamais assouplir un test sans comprendre ce qu'il protège.

- [ ] **Step 2: Contrôle visuel multi-largeurs**

Run: `npm run build && npx serve dist -l 4173`
Vérifier `http://localhost:4173/App/` :
- 375px : identique à avant (nav fixée en bas, scroll de page, aucun chrome marketing).
- 768px : colonne 520px centrée, pleine hauteur, scroll interne.
- 1280px : coquille 1080px ; feed en 3–4 colonnes ; formulaires (flux de publication, profil) contraints à 640px centrés ; nav compacte centrée.
- 1680px : identique à 1280px, coquille bornée à 1080px.
- Fiche annonce à 1280px : colonne 760px, photo principale ≥380px de haut.

**Step 3 (post-merge, déploiement Railway) :** après push et build Railway, revalider les mêmes largeurs sur l'URL de production (règle projet : vérifier que le build est terminé et la nouvelle version en ligne ; un « Deploy Crashed » transitoire de 30–60s est normal).
