# Zwibba Per Listing Share OG Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Afficher une carte de partage (WhatsApp, Facebook) propre à chaque annonce réelle — image (story brandée si dispo, sinon photo brute), prix et localité — en (1) partageant une URL `/annonce/<slug>/` que le serveur HTTP reçoit réellement au lieu du fragment `/App/#listing/<slug>`, et (2) faisant résoudre cette annonce par `server.mjs` via l'API publique `GET /listings/:slug` au moment du scrape, avec injection des balises Open Graph et repli de marque si l'API ne répond pas.

**Architecture:** Trois zones. **(A) Helper OG partagé** — nouveau module ESM `shared/listing-og.mjs` qui transforme un objet annonce (`{ slug, title, priceAmount, priceCurrency, locationLabel, primaryImageUrl, storyImageUrl }`) en un set de balises `<meta>` Open Graph + Twitter, image raster (jamais SVG), prix + localité dans la description, repli `og-default.png`. **(B) Serveur** — `server.mjs` : quand `/annonce/<slug>/` n'a pas de fichier statique, appeler `${ZWIBBA_API_BASE_URL}/listings/<slug>` (timeout court), rendre un document HTML minimal avec les balises du helper + redirection JS vers `/App/#listing/<slug>` ; repli `og-default.png` sur 404/erreur/timeout. **(C) App** — `App/app.js` : l'URL **de partage** (`state.publishedListingUrl` et les `data-listing-url` consommés par WhatsApp/Facebook/copier) devient `/annonce/<slug>/` ; la navigation interne « Voir mon annonce » garde `#listing/<slug>`.

**Tech Stack:** Vanilla JS ESM (`App/app.js`, `shared/listing-og.mjs`), serveur Node natif (`server.mjs`, `node:http`, `fetch` global Node ≥18), runner `node --test tests/*.test.mjs` avec harness `spawn`/`fetch` déjà présent dans `tests/build.test.mjs`.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append, after the latest existing entry and before the "Legacy docs" trailer:

```
- `2026-05-31-zwibba-per-listing-share-og-design.md`
- `2026-05-31-zwibba-per-listing-share-og-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "per-listing-share-og" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index per-listing-share-og plans"
```

---

### Task 2: Failing test for the listing→OG helper

**Files:**
- Create: `tests/listing-og.test.mjs`

**Step 1: Write the failing test**

Create `tests/listing-og.test.mjs` important `buildListingOgTags` depuis `../shared/listing-og.mjs`. La fonction prend un objet annonce et une `baseUrl` absolue, et renvoie une string de balises `<meta>` (ou un objet sérialisable — choisir une signature et la tester). Assertions :

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildListingOgTags } from '../shared/listing-og.mjs';

const base = 'https://website-production-7a12.up.railway.app';

test('uses the story image and brand title when storyImageUrl is present', () => {
  const html = buildListingOgTags({
    listing: {
      slug: 'bague-or-blanc',
      title: 'Bague or blanc',
      priceAmount: 80000,
      priceCurrency: 'CDF',
      locationLabel: 'Gombe, Kinshasa',
      primaryImageUrl: 'https://cdn/photo.jpg',
      storyImageUrl: 'https://r2/listings/l1/story.png',
    },
    baseUrl: base,
  });
  assert.match(html, /property="og:image" content="https:\/\/r2\/listings\/l1\/story\.png"/);
  assert.match(html, /property="og:image:width" content="1080"/);
  assert.match(html, /property="og:title" content="Je vends sur Zwibba ! Bague or blanc"/);
  assert.match(html, /property="og:url" content="https:\/\/website-production-7a12\.up\.railway\.app\/annonce\/bague-or-blanc\/"/);
  assert.match(html, /Gombe, Kinshasa/);          // localité dans la description
  assert.match(html, /80\s?000/);                  // prix formaté dans la description
});

test('falls back to the raw photo (raster, never svg) when no story image', () => {
  const html = buildListingOgTags({
    listing: {
      slug: 'velo-x',
      title: 'Vélo X',
      priceAmount: 50000,
      priceCurrency: 'CDF',
      locationLabel: 'Lemba, Kinshasa',
      primaryImageUrl: 'https://cdn/velo.jpg',
      storyImageUrl: null,
    },
    baseUrl: base,
  });
  assert.match(html, /property="og:image" content="https:\/\/cdn\/velo\.jpg"/);
  assert.doesNotMatch(html, /property="og:image" content="[^"]+\.svg"/);
  assert.doesNotMatch(html, /og:image:width/); // pas de dimensions story quand photo brute
});

test('falls back to the brand og-default.png when no image at all', () => {
  const html = buildListingOgTags({
    listing: {
      slug: 'sans-photo',
      title: 'Sans photo',
      priceAmount: 1000,
      priceCurrency: 'CDF',
      locationLabel: 'Matete',
      primaryImageUrl: null,
      storyImageUrl: null,
    },
    baseUrl: base,
  });
  assert.match(html, /property="og:image" content="https:\/\/website-production-7a12\.up\.railway\.app\/assets\/brand\/og-default\.png"/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/listing-og.test.mjs`
Expected: FAIL — `shared/listing-og.mjs` n'existe pas.

**Step 3: Commit**

```bash
git add tests/listing-og.test.mjs
git commit -m "test: cover listing open graph tag builder"
```

---

### Task 3: Implement the listing→OG helper

**Files:**
- Create: `shared/listing-og.mjs`

**Step 1: Write the code**

Créer `shared/listing-og.mjs` exportant `buildListingOgTags({ listing, baseUrl })`. Logique, calquée sur `renderListingPage`/`renderLayout` de `scripts/build.mjs` (réutiliser exactement le même mapping) :

- `hasStory = Boolean(listing.storyImageUrl)`.
- `imageUrl = listing.storyImageUrl || listing.primaryImageUrl || `${baseUrl}/assets/brand/og-default.png``. Si `imageUrl` est relatif, le résoudre en absolu via `new URL(imageUrl, baseUrl)`.
- `ogTitle = hasStory ? `Je vends sur Zwibba ! ${listing.title}` : `${listing.title} | Zwibba``.
- Prix formaté : reproduire le format de `formatCdf` (séparateur de milliers, suffixe devise) ; description = `${prix} — ${listing.locationLabel}` (localité = champ `locationLabel` renvoyé par l'API, cf. `toListingDetail`).
- `og:url = `${baseUrl}/annonce/${listing.slug}/``.
- Émettre les balises : `og:type=website`, `og:site_name=Zwibba`, `og:locale=fr_CD`, `og:title`, `og:description`, `og:url`, `og:image` ; `og:image:width=1080`/`og:image:height=1920` **uniquement** si `hasStory` ; `product:price:amount`/`product:price:currency` ; `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`. Échapper les valeurs (helper d'échappement HTML local).
- Renvoyer la concaténation des balises (string).

**Step 2: Run test to verify it passes**

Run: `node --test tests/listing-og.test.mjs`
Expected: PASS — les trois tests verts.

**Step 3: Commit**

```bash
git add shared/listing-og.mjs
git commit -m "feat: add listing open graph tag builder"
```

---

### Task 4: Failing test for server-side per-listing OG rendering

**Files:**
- Modify: `tests/build.test.mjs`

**Step 1: Write the failing test**

Réutiliser le harness `withServer` existant, qui spawn `server.mjs` avec un `env` injectable (adapter `withServer` pour accepter un `env` supplémentaire passé à `spawn`, comme `buildSite(env)` le fait déjà). Le test démarre un **petit serveur mock** Node (`createServer`) qui répond à `GET /listings/<slug>` par un JSON d'annonce, puis lance `server.mjs` avec `ZWIBBA_API_BASE_URL` pointant sur ce mock, et requête `/annonce/<slug-non-statique>/` :

```js
test('runtime renders per-listing OG tags for a non-static slug via the API', async () => {
  // 1. mock API server returning a listing for slug "mon-annonce-test"
  // 2. withServer({ ZWIBBA_API_BASE_URL: mockBase }) -> fetch `${baseUrl}/annonce/mon-annonce-test/`
  // 3. assert body contains:
  //    <meta property="og:image" content="<storyImageUrl from mock>"
  //    prix + localité dans la description
  //    une redirection vers /App/#listing/mon-annonce-test
  assert.match(body, /property="og:image" content="https:\/\/r2\/[^"]+story\.png"/);
  assert.match(body, /#listing\/mon-annonce-test/);
});

test('runtime falls back to brand og-default.png when the API has no such listing', async () => {
  // mock API returns 404 ; withServer ; fetch /annonce/inconnu-xyz/
  // assert body og:image -> /assets/brand/og-default.png AND response not 500
  assert.match(body, /assets\/brand\/og-default\.png/);
});
```

Choisir un slug **qui n'existe pas** dans `src/site/content.mjs` (donc pas de page statique `dist/annonce/<slug>/`), pour forcer la branche dynamique. Vérifier d'abord la liste des slugs statiques pour en choisir un hors-liste (ex. `mon-annonce-test`).

**Step 2: Run test to verify it fails**

Run: `node --test tests/build.test.mjs`
Expected: FAIL — `server.mjs` renvoie 404 pour un slug non statique (aucune branche API).

**Step 3: Commit**

```bash
git add tests/build.test.mjs
git commit -m "test: cover server-side per-listing OG rendering"
```

---

### Task 5: Implement the dynamic per-listing branch in server.mjs

**Files:**
- Modify: `server.mjs`

**Step 1: Write the code**

Dans `server.mjs` :

1. Lire `const apiBaseUrl = process.env.ZWIBBA_API_BASE_URL || 'https://api-production-b1b58.up.railway.app';` en tête.
2. Importer `buildListingOgTags` depuis `./shared/listing-og.mjs`.
3. Dans le handler de requête : si `url.pathname` matche `^/annonce/([^/]+)/?$` ET qu'aucun fichier statique `dist/annonce/<slug>/index.html` n'existe (réutiliser `resolveFile` ou `existsSync`), alors basculer en mode dynamique **asynchrone** :
   - `fetch(`${apiBaseUrl}/listings/${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(2500) })`.
   - Sur réponse OK : parser le JSON, construire `const ogTags = buildListingOgTags({ listing, baseUrl })` où `baseUrl` dérive de `RAILWAY_PUBLIC_DOMAIN` ou de l'en-tête `Host`. Rendre un document HTML minimal : `<head>` avec `<title>`, les `ogTags`, un `<link rel="canonical">`, et un `<script>location.replace('/App/#listing/<slug>')</script>` + un `<noscript>` avec un lien vers `/App/`. Répondre 200, `Content-Type: text/html`, `Cache-Control: no-cache`.
   - Sur 404 / erreur réseau / timeout : rendre le même document mais avec les balises de repli de marque (`buildListingOgTags` avec une annonce minimale → `og-default.png`), répondre 200 (jamais 500, jamais bloquer le partage). Logguer un warning.
4. Le `createServer(...)` doit accepter un handler `async` (le callback devient `async (request, response) => { ... }`), en gardant le chemin synchrone existant pour tous les autres fichiers.

Conserver tout le comportement actuel pour `/`, `/App/`, `/r/`, assets, et les pages `/annonce/<slug>/` qui **existent** statiquement (priorité au fichier statique).

**Step 2: Run test to verify it passes**

Run: `node --test tests/build.test.mjs`
Expected: PASS — le rendu dynamique et le repli passent ; les tests serveur existants (`/App/`, `/r/`, assets MIME) restent verts.

**Step 3: Commit**

```bash
git add server.mjs
git commit -m "feat: render per-listing OG tags from the API at request time"
```

---

### Task 6: Failing test for the share URL switch in the App

**Files:**
- Modify: `tests/success-screen.test.mjs`

**Step 1: Write the failing test**

Le partage doit cibler `/annonce/<slug>/`. Le success-screen reçoit `listingUrl`. Ajouter un test asserttant que, lorsqu'on lui passe un `listingUrl` de forme `/annonce/<slug>/`, l'ancre WhatsApp et le bouton Facebook le portent (et **pas** un `#listing/`). Comme la décision d'URL se prend dans `App/app.js` (non couvert par un test unitaire DOM aujourd'hui), porter l'assertion au niveau du rendu du success-screen avec un `listingUrl` `/annonce/...` :

```js
test('success screen share affordances point to the public /annonce/<slug>/ url', () => {
  const html = renderSuccessScreen(buildApprovedContext({ listingUrl: '/annonce/mon-annonce/' }));
  assert.match(html, /data-action="share-whatsapp-chat"[^>]*href="[^"]*\/annonce\/mon-annonce\/[^"]*"/s);
  assert.match(html, /data-action="share-facebook"[^>]*data-listing-url="\/annonce\/mon-annonce\/"/s);
  assert.doesNotMatch(html, /#listing\//);
});
```

Adapter `buildApprovedContext` au helper réel du fichier (il accepte déjà `listingUrl`). Si l'ordre des attributs casse le `match`, scinder en deux assertions plus simples (présence de `/annonce/mon-annonce/` ET absence de `#listing/`).

**Step 2: Run test to verify it fails**

Run: `node --test tests/success-screen.test.mjs`
Expected: PASS ou FAIL selon le rendu actuel — si le success-screen reflète déjà fidèlement le `listingUrl` qu'on lui donne, ce test passe déjà et c'est `App/app.js` qui doit changer (Task 7). Dans ce cas, transformer ce test en garde-fou (il doit rester vert) et déplacer la vraie assertion de bascule sur un test ciblant la logique de `App/app.js`. Documenter le choix dans le message de commit.

**Step 3: Commit**

```bash
git add tests/success-screen.test.mjs
git commit -m "test: assert success screen share uses public annonce url"
```

---

### Task 7: Switch the App share URL to /annonce/<slug>/

**Files:**
- Modify: `App/app.js`

**Step 1: Write the code**

Dans `App/app.js`, dissocier **URL de partage** et **route de navigation interne** :

- Garder `state.publishedListingRoute = #listing/<slug>` pour le bouton « Voir mon annonce » (navigation SPA sans reload), inchangé.
- Pour `state.publishedListingUrl` (consommée par WhatsApp / Facebook / copier le lien), utiliser `/annonce/<slug>/` quand `result.outcome.listingSlug` est disponible : `state.publishedListingUrl = `/annonce/${result.outcome.listingSlug}/``. Conserver le repli `buildListingUrl(result.draft)` (qui produit déjà `/annonce/<slug>/`) quand le slug d'outcome manque.
- Vérifier les autres points où une URL de partage est dérivée de `buildListingUrl(state.draft)` dans le délégateur de clic (cases `share-whatsapp-chat`, `share-facebook`, `copy-listing-link`) : ils utilisent déjà `buildListingUrl` → `/annonce/<slug>/`, donc cohérents. S'assurer qu'aucune URL de partage ne reste sous forme `/App/#listing/...`.

**Step 2: Run test to verify it passes**

Run: `node --test tests/success-screen.test.mjs tests/post-flow.test.mjs`
Expected: PASS — le garde-fou de Task 6 reste vert, aucune régression post-flow.

**Step 3: Commit**

```bash
git add App/app.js
git commit -m "fix: share listings via public /annonce/<slug>/ url"
```

---

### Task 8: Full-suite verification, build and website smoke

**Files:**
- (none — cross-cutting verification)

**Step 1: Run the full checks**

```bash
npm install
node --test tests/*.test.mjs
npm run build
npm run smoke:website
```

Expected: toutes les suites `tests/*.test.mjs` vertes, `npm run build` régénère `dist/` sans erreur, `npm run smoke:website` passe. (`npm install` est requis dans un worktree neuf — sinon `tests/live-beta-helpers.test.mjs` échoue à tort sur `playwright` manquant.)

**Step 2: Spot-check**

Run: `rg -n "buildListingOgTags|/listings/|/annonce/" server.mjs | head` et `rg -n "annonce/\$\{|publishedListingUrl" App/app.js | head`
Expected: `server.mjs` importe et utilise `buildListingOgTags` + fetch `/listings/`, et `App/app.js` construit l'URL de partage en `/annonce/<slug>/`.

**Step 3:** Skip the commit step for this task because no file was modified.
