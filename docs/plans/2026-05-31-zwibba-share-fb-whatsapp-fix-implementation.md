# Zwibba Share FB WhatsApp Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corriger deux bugs de partage depuis le success-screen de la PWA : (1) une carte Facebook sans image quand on partage une annonce, en ajoutant un jeu Open Graph (image raster brandée 1200×630) au shell `/App/` généré par `scripts/build.mjs` ; (2) le bouton WhatsApp inerte, dont la cause confirmée est double — le délégateur `handleListingShareAction` de `App/app.js` appelle `event.preventDefault()` pour **tout** `[data-action]` puis n'a **aucun case** pour `share-whatsapp-chat` (l'ancre WhatsApp ne navigue donc jamais), et l'URL `https://wa.me/?text=` (sans numéro) n'est pas fiable. Scope limité aux axes 1 et 3 ; le routage du partage vers `/annonce/{slug}/` reste hors scope.

**Architecture:** Deux zones indépendantes. **(1) Build/shell** — `scripts/build.mjs` : `renderAppPage()` produit le document `/App/` (titre « Zwibba App ») sans aucune balise Open Graph. On y injecte un bloc OG/Twitter calqué sur celui de `renderLayout()`, en réutilisant `resolveUrl()` (`new URL(path, site.baseUrl)`) et l'objet `site` (`site.name`, `site.locale`). Comme aucun raster n'existe sur la branche, on ajoute l'asset `og-default.png` (fourni, 1200×630) à la racine du repo et on le copie vers `dist/assets/brand/og-default.png` via un `cpSync` calqué sur celui qui copie déjà `Logo_zwibba.svg`. **(2) PWA partage** — `App/features/post/success-screen.mjs` définit localement `buildWhatsAppShareUrl()` (utilisé pour le `href` de l'ancre `share-whatsapp-chat`) : on corrige sa base en `https://api.whatsapp.com/send?text=`. `App/app.js` : on ajoute à `handleListingShareAction()` un case `share-whatsapp-chat` qui ouvre l'URL via `window.open(url, '_blank', 'noopener')`, en miroir exact du case `share-facebook`/`handleFacebookShare()` existant.

**Tech Stack:** Vanilla JS ESM (`App/features/post/success-screen.mjs`, `App/app.js`), générateur statique Node (`scripts/build.mjs`, `src/site/content.mjs`), runner `node --test tests/*.test.mjs`, asset PNG brandé.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the "Current priority docs" list in `docs/plans/README.md`, after the latest existing entry, before the "Legacy docs" trailer:

```
- `2026-05-31-zwibba-share-fb-whatsapp-fix-design.md`
- `2026-05-31-zwibba-share-fb-whatsapp-fix-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "share-fb-whatsapp-fix" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index share-fb-whatsapp-fix plans"
```

---

### Task 2: Failing test for Open Graph tags on the `/App/` shell

**Files:**
- Modify: `tests/build.test.mjs`

**Step 1: Write the failing test**

Lire d'abord le harness existant de `tests/build.test.mjs` : il exécute un build et lit le HTML généré (variables `landing`, `detail` via `readFileSync` des fichiers de `dist/…`, et un test serveur qui `fetch('/App/')`). Réutiliser la même mécanique pour charger le HTML de `dist/App/index.html` après build, puis ajouter un test :

```js
test('app shell exposes Open Graph tags with a raster default image', () => {
  // obtenir le HTML de dist/App/index.html via le même helper de build/lecture que les autres tests
  const appShell = readFileSync(path.join(distDir, 'App', 'index.html'), 'utf8');
  assert.match(appShell, /<meta property="og:image" content="https:\/\/zwibba\.com\/assets\/brand\/og-default\.png"/);
  assert.match(appShell, /<meta property="og:title"/);
  assert.match(appShell, /<meta property="og:description"/);
  assert.match(appShell, /<meta property="og:url" content="https:\/\/zwibba\.com\/App\/"/);
  assert.doesNotMatch(appShell, /<meta property="og:image" content="[^"]+\.svg"/);
});
```

Adapter `distDir`/le chemin et la façon d'obtenir le HInTML au harness réel du fichier (constantes déjà définies en tête de `build.test.mjs`). Garder la base `https://zwibba.com` (valeur de `site.baseUrl`).

**Step 2: Run test to verify it fails**

Run: `node --test tests/build.test.mjs`
Expected: FAIL — `renderAppPage()` n'émet aucune balise `og:*` aujourd'hui.

**Step 3: Commit**

```bash
git add tests/build.test.mjs
git commit -m "test: cover open graph tags on app shell"
```

---

### Task 3: Add the OG image asset and Open Graph tags to the `/App/` shell

**Files:**
- Create: `og-default.png` (racine du repo — fichier binaire fourni avec ce plan)
- Modify: `scripts/build.mjs`

**Step 1: Write the code**

1. Placer le fichier `og-default.png` (1200×630, fourni dans `.zwibba-plan-staging/` à côté de ce plan) à la racine du repo, exactement comme `Logo_zwibba.svg`.

2. Dans `scripts/build.mjs`, dans la phase de copie des assets (là où se trouve déjà `cpSync(path.join(repoRoot, 'Logo_zwibba.svg'), path.join(assetsDir, 'brand', 'logo-zwibba.svg'), { recursive: false })`), ajouter juste après :

```js
cpSync(path.join(repoRoot, 'og-default.png'), path.join(assetsDir, 'brand', 'og-default.png'), { recursive: false });
```

3. Dans `renderAppPage()`, insérer dans le `<head>` (juste après `<meta name="color-scheme" content="dark" />`) un bloc Open Graph + Twitter calqué sur celui de `renderLayout()` :

- `og:type` = `website`
- `og:locale` = `${site.locale}`
- `og:site_name` = `${site.name}`
- `og:title` = `Zwibba App`
- `og:description` = la même valeur que le `<meta name="description">` du shell
- `og:url` = `${resolveUrl('/App/')}`
- `og:image` = `${resolveUrl('/assets/brand/og-default.png')}`
- `og:image:width` = `1200`, `og:image:height` = `630`
- `twitter:card` = `summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image` = `${resolveUrl('/assets/brand/og-default.png')}`

Réutiliser `resolveUrl` et `site` déjà en portée dans le module — ne pas réintroduire de littéral d'URL absolue.

**Step 2: Run test to verify it passes**

Run: `node --test tests/build.test.mjs`
Expected: PASS — les assertions OG du shell passent et l'assertion `doesNotMatch ...\.svg` confirme un raster.

**Step 3: Commit**

```bash
git add og-default.png scripts/build.mjs
git commit -m "feat: add open graph card to app shell"
```

---

### Task 4: Failing test for a reliable WhatsApp share URL on the success screen

**Files:**
- Modify: `tests/success-screen.test.mjs`

**Step 1: Write the failing test**

`tests/success-screen.test.mjs` importe déjà `renderSuccessScreen` et construit un contexte « approved » avec un `listingUrl` (réutiliser le helper de contexte déjà présent dans le fichier). Ajouter un test qui asserte que l'ancre WhatsApp rendue pointe vers `api.whatsapp.com` :

```js
test('success screen whatsapp link uses the api.whatsapp.com endpoint', () => {
  const html = renderSuccessScreen(/* contexte approved avec listingUrl, comme les tests voisins */);
  assert.match(html, /href="https:\/\/api\.whatsapp\.com\/send\?text=[^"]+"/);
  assert.doesNotMatch(html, /href="https:\/\/wa\.me/);
});
```

Adapter la construction du contexte au helper exact déjà utilisé par les tests « share buttons » du fichier.

**Step 2: Run test to verify it fails**

Run: `node --test tests/success-screen.test.mjs`
Expected: FAIL — `buildWhatsAppShareUrl` produit aujourd'hui un `href="https://wa.me/?text=..."`.

**Step 3: Commit**

```bash
git add tests/success-screen.test.mjs
git commit -m "test: assert success screen whatsapp link uses api.whatsapp.com"
```

---

### Task 5: Switch the WhatsApp URL builder to `api.whatsapp.com`

**Files:**
- Modify: `App/features/post/success-screen.mjs`

**Step 1: Write the code**

Dans `App/features/post/success-screen.mjs`, fonction locale `buildWhatsAppShareUrl({ draft, listingUrl })`, remplacer la dernière ligne `return \`https://wa.me/?text=${encodeURIComponent(text)}\`;` par `return \`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}\`;`. Le texte (`Je vends sur Zwibba ! {titre} — {absoluteUrl}`) reste inchangé. Vérifier qu'aucun autre fichier de `App/` ne reconstruit `wa.me/?text=` : `rg -n "wa\.me" App/`.

**Step 2: Run test to verify it passes**

Run: `node --test tests/success-screen.test.mjs`
Expected: PASS — l'ancre WhatsApp pointe désormais vers `https://api.whatsapp.com/send?text=...` et les tests existants du fichier restent verts.

**Step 3: Commit**

```bash
git add App/features/post/success-screen.mjs
git commit -m "fix: use api.whatsapp.com for whatsapp share url"
```

---

### Task 6: Handle the `share-whatsapp-chat` action in the app click delegator

**Files:**
- Modify: `App/app.js`

**Step 1: Write the code**

Dans `App/app.js`, le délégateur `handleListingShareAction(event)` fait `const trigger = event.target.closest('[data-action]')` puis `event.preventDefault()` **inconditionnel**, puis enchaîne des `if (trigger.dataset.action === '…')`. Il existe un case `share-facebook` qui appelle `handleFacebookShare(trigger.dataset.listingUrl || buildListingUrl(state.draft))`, lequel fait `window.open(shareUrl, '_blank', 'noopener')`. Il n'existe **aucun** case `share-whatsapp-chat` : l'ancre WhatsApp est donc neutralisée par le `preventDefault` sans handler de repli.

Ajouter, juste à côté du case `share-facebook`, un case symétrique :

```js
if (trigger.dataset.action === 'share-whatsapp-chat') {
  handleWhatsAppShare(trigger.dataset.listingUrl || buildListingUrl(state.draft));
  return;
}
```

et une fonction `handleWhatsAppShare(rawListingUrl)` calquée sur `handleFacebookShare` : résoudre l'URL absolue (même logique `new URL(rawListingUrl, window.location.origin)` que `handleFacebookShare`), construire le texte « Je vends sur Zwibba ! … — {url} », puis `window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank', 'noopener')`. Réutiliser le même titre/format de texte que `buildWhatsAppShareUrl` du success-screen pour rester cohérent.

**Step 2: Verify**

Run: `node --test` puis `npm run build`
Expected: `node --test` reste vert (aucune régression sur les suites existantes), `npm run build` régénère `dist/` sans erreur. Spot-check du bundle copié :
`rg -n "share-whatsapp-chat|api.whatsapp.com" dist/assets/app/app.js`
Expected: le case `share-whatsapp-chat` et l'URL `api.whatsapp.com` apparaissent dans le bundle servi.

Note de couverture : il n'existe pas aujourd'hui de harness de test unitaire JSDOM pour `App/app.js` dans `tests/` (vérifié). Si à la lecture un tel harness existe (un test qui bootstrappe `App/app.js`), ajouter une assertion espionnant `window.open` sur un clic `share-whatsapp-chat` ; sinon, la correction d'URL est déjà couverte par le test de l'ancre (Task 4) et ce handler est validé par le build + le spot-check `rg` ci-dessus, puis par un test manuel sur device après déploiement.

**Step 3: Commit**

```bash
git add App/app.js
git commit -m "fix: handle whatsapp share click via window.open"
```

---

### Task 7: Full-suite verification, build and website smoke

**Files:**
- (none — cross-cutting verification)

**Step 1: Run the full checks**

Run, dans l'ordre :

```bash
node --test tests/*.test.mjs
npm run build
npm run smoke:website
```

Expected: toutes les suites `tests/*.test.mjs` vertes (aucune régression), `npm run build` régénère `dist/` sans erreur, `npm run smoke:website` passe (présence de `dist/index.html`, `dist/App/index.html`, `dist/assets/app/app.js`).

**Step 2: Spot-check the generated artefacts**

Run: `rg -n "og:image|og-default|api.whatsapp.com" dist/App/index.html dist/assets/app/features/post/success-screen.mjs dist/assets/app/app.js`
Expected: `dist/App/index.html` contient les balises OG vers `/assets/brand/og-default.png` ; le success-screen et le bundle `app.js` contiennent `api.whatsapp.com`. Vérifier aussi `test -f dist/assets/brand/og-default.png`.

**Step 3:** Skip the commit step for this task because no file was modified.
