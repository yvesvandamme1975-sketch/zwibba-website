# Zwibba Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corriger les défauts critiques relevés par l'audit UI/UX du 14/08/2026 (vitrine + PWA) : livraison d'assets incohérente (cache 4 h sans fingerprint), skip-link et hamburger cassés, CTA stores morts, wording interne exposé, tri multi-devises faux, indicateur de pays absent, données de test en prod.

**Architecture:** Monorepo statique — `scripts/build.mjs` génère `dist/` depuis `src/site/` (vitrine, locales fr-cd/fr-be/nl-be) et `App/` (PWA vanilla ESM, hash-routing). `server.mjs` sert `dist/` sur Railway derrière Cloudflare. Tests : `node --test tests/*.test.mjs`. La purge des données de test vit dans `apps/api` (NestJS + Prisma).

**Tech Stack:** Node ≥18, ESM vanilla, node:test, Prisma (apps/api), Railway + Cloudflare.

**Branche de travail :** créée depuis `origin/codex/website-vitrine-backup` (trunk de déploiement — PAS `main`, qui est obsolète).

**Contexte critique pour l'exécuteur :**
- La prod sert les assets avec `cache-control: max-age=14400` SANS fingerprint → pendant ≤4 h après chaque deploy, les clients mixent d'anciens et de nouveaux modules ESM (observé en prod : `app.js` ancien + `buyer-browse-controller.mjs` neuf = recherche cassée). La Tâche 1 corrige ça en premier ; toute vérification prod post-deploy doit recharger 2× et vérifier `caches.keys()`.
- Déjà corrigé sur trunk, NE PAS refaire : préfixe téléphone +32/BE (PR #48, `resolveDefaultPhonePrefix`), og:image PNG (`og-default.png` dans build.mjs), bouton OTP WhatsApp (PR #47).

---

### Task 1: Fingerprint des assets + en-têtes de cache corrects (structurel, priorité 1)

Le build émet des chemins stables (`/assets/app/app.js`). Objectif : suffixer les URL d'assets avec la version de build (`?v=<BUILD>`) dans TOUTES les références HTML et imports dynamiques, et faire servir par `server.mjs` : HTML + service-worker en `no-cache`, assets versionnés en `max-age=31536000, immutable`.

**Files:**
- Modify: `scripts/build.mjs` (injection `?v=` sur les `<script>`, `<link rel="stylesheet">`, et la constante `__ZWIBBA_BUILD__` existe déjà pour le SW)
- Modify: `server.mjs` (en-têtes cache par type de chemin)
- Modify: `src/site/service-worker.js` (l'app shell caché doit référencer les URL versionnées)
- Test: `tests/asset-versioning.test.mjs` (create)

**Step 1: Écrire le test qui échoue**

```js
// tests/asset-versioning.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('les pages construites référencent des assets versionnés', () => {
  execSync('node scripts/build.mjs', { stdio: 'ignore' });
  const html = readFileSync('dist/App/index.html', 'utf8');
  const site = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /\/assets\/app\/app\.js\?v=\d+/);
  assert.match(site, /\/assets\/styles\.css\?v=\d+/);
});

test('server.mjs déclare les bons en-têtes de cache', () => {
  const src = readFileSync('server.mjs', 'utf8');
  assert.match(src, /no-cache/); // HTML + service worker
  assert.match(src, /immutable/); // assets versionnés
});
```

**Step 2: Vérifier l'échec** — `node --test tests/asset-versioning.test.mjs` → FAIL (pas de `?v=`).

**Step 3: Implémenter.** Dans `build.mjs`, centraliser un helper `assetUrl(path)` → `${path}?v=${buildVersion}` (réutiliser la valeur qui remplace `__ZWibba_BUILD__`/`__ZWIBBA_BUILD__`) et l'appliquer aux templates HTML (`<script src>`, `<link href>`, preload). Dans `server.mjs`, avant de servir : si chemin finit par `.html` ou est une navigation ou contient `service-worker` → `Cache-Control: no-cache` ; si requête possède `?v=` → `Cache-Control: public, max-age=31536000, immutable` ; sinon `max-age=300`. Attention : les imports ESM internes entre modules `App/*.mjs` ne portent pas de `?v=` — c'est acceptable car le point d'entrée versionné change à chaque build et le SW purge son cache par version ; ne PAS réécrire les imports internes (garder le diff minimal).

**Step 4: Vérifier** — `node --test tests/asset-versioning.test.mjs` puis suite complète `npm test` → PASS. `npm run smoke:website` → PASS.

**Step 5: Commit** — `fix(build): version asset urls and serve immutable cache headers`

---

### Task 2: Skip-link — un seul mécanisme de masquage (quick-win)

Deux blocs `.skip-link` en conflit : l'inline des pages (`left:-9999px`, révélé par `:focus`) est écrasé par `src/site/styles.css:109-124` (`left:16px` + `translateY(-140%)`), et la bannière pays décale le conteneur → le lien est visible en permanence et recouvre la bannière en mobile.

**Files:**
- Modify: `src/site/styles.css:109-124`
- Modify: `scripts/build.mjs` (supprimer le `<style>` inline `.skip-link` dupliqué des templates)
- Test: `tests/skip-link.test.mjs` (create)

**Step 1: Test qui échoue**

```js
// tests/skip-link.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('une seule définition du skip-link, cachée hors écran par défaut', () => {
  execSync('node scripts/build.mjs', { stdio: 'ignore' });
  const html = readFileSync('dist/index.html', 'utf8');
  assert.doesNotMatch(html, /skip-link\s*\{[^}]*left:\s*-9999px/); // plus d'inline dupliqué
  const css = readFileSync('dist/assets/styles.css', 'utf8');
  assert.match(css, /\.skip-link[^}]*position:\s*fixed/);
  assert.match(css, /\.skip-link:focus-visible/);
});
```

**Step 2:** `node --test tests/skip-link.test.mjs` → FAIL.

**Step 3: Implémenter.** Dans `styles.css`, remplacer le bloc par un masquage indépendant du layout (la bannière ne doit plus influencer la position) :

```css
.skip-link {
  position: fixed;
  top: 12px;
  left: 16px;
  z-index: 1000;
  padding: 12px 16px;
  border-radius: 999px;
  background: #f5f7f6;
  color: #111214;
  transform: translateY(calc(-100% - 24px));
  transition: transform 0.2s ease;
}

.skip-link:focus-visible {
  transform: translateY(0);
}
```

Supprimer le `<style>` inline `.skip-link` des templates dans `build.mjs`.

**Step 4:** tests → PASS. Vérif manuelle : `npm run build && node server.mjs` + preview → le pill n'apparaît qu'au Tab.

**Step 5: Commit** — `fix(site): skip-link hidden by default, single definition`

---

### Task 3: Icône hamburger visible (quick-win)

Les SVG de `.menu-toggle__icon` n'ont aucune dimension → bouton vide 48px sur mobile.

**Files:**
- Modify: `src/site/styles.css` (autour de :176-198)
- Test: `tests/menu-toggle.test.mjs` (create)

**Step 1: Test qui échoue**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('les icônes du menu-toggle ont une taille explicite', () => {
  const css = readFileSync('src/site/styles.css', 'utf8');
  assert.match(css, /\.menu-toggle__icon svg\s*\{[^}]*width:\s*22px/);
});
```

**Step 2:** FAIL. **Step 3:** Ajouter après `.menu-toggle` :

```css
.menu-toggle__icon {
  display: inline-flex;
}

.menu-toggle__icon svg {
  width: 22px;
  height: 22px;
}
```

**Step 4:** PASS + vérif preview mobile (icône ☰ visible, ✕ à l'ouverture). **Step 5: Commit** — `fix(site): size menu-toggle svg icons`

---

### Task 4: CTA stores honnêtes (quick-win)

L'app n'est pas publiée : Google Play (`id=com.zwibba.app`) → 404, Huawei → homepage générique. Remplacer les boutons stores par un état « Bientôt disponible » non cliquable + un CTA réel « Ouvrir l'application web » (`/App/`), dans les 3 locales. Renommer le bouton nav `download` (« Télécharger » → « Programme ambassadeur ») OU le supprimer ; supprimer le bouton nav « Explorer » (doublon d'« Annonces »).

**Files:**
- Modify: `src/site/locales/fr-cd.mjs:28-38,55-57` ; `src/site/locales/fr-be.mjs:30-38,55-57` ; `src/site/locales/nl-be.mjs:30-38` (structure `stores` : ajouter `available: false`)
- Modify: `scripts/build.mjs` (template store-button : rendu non-lien quand `available === false` ; nav :242 — retirer « Explorer », relabelliser download)
- Test: `tests/store-cta.test.mjs` (create)

**Step 1: Test qui échoue**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('aucun lien Play Store mort dans les pages construites', () => {
  execSync('node scripts/build.mjs', { stdio: 'ignore' });
  const html = readFileSync('dist/index.html', 'utf8');
  assert.doesNotMatch(html, /<a[^>]*play\.google\.com/);
  assert.doesNotMatch(html, /<a[^>]*appgallery\.huawei\.com/);
  assert.match(html, /Bientôt disponible/);
});

test('la nav ne contient plus Explorer et le CTA app web existe', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.doesNotMatch(html, />Explorer</);
  assert.match(html, /href="\/App\/"/);
});
```

**Step 2:** FAIL. **Step 3:** Dans les locales, `stores: [{ ..., available: false }]` ; dans `build.mjs`, quand `available === false`, rendre `<span class="store-button store-button--soon" aria-disabled="true">` (mêmes contenus, note « Bientôt disponible ») ; ajouter `.store-button--soon { opacity: 0.55; pointer-events: none; }` dans `styles.css`. Nav : garder `Ouvrir l'application` (primary) + lien ambassadeur relabellisé, retirer « Explorer ». Conserver les attributs data pour le tracking referral (vérifier `tests/` existants sur l'ambassadeur avant de toucher `/r/`).

**Step 4:** `npm test` complet → PASS (adapter les tests existants qui référencent les stores si besoin, sans en réduire la couverture). **Step 5: Commit** — `fix(site): honest store CTAs, dedupe nav`

---

### Task 5: Indicateur de pays dans les headers (demande Yves)

Un utilisateur doit voir immédiatement s'il est sur la plateforme congolaise ou belge. Ajouter un badge drapeau + code (🇨🇩 RDC / 🇧🇪 Belgique) : dans le header de la PWA (à côté du brand, tous les écrans) et dans le header de la vitrine (à côté du logo). Dans la PWA, le badge reflète `resolveBrowseCountry()` ; cliquer dessus mène à l'onglet Acheter où vit le toggle existant.

**Files:**
- Modify: `App/components/in-app-brand.mjs` (accepter `countryCode` et rendre le badge)
- Modify: `App/app.js` (passer `resolveBrowseCountry()` aux appels `renderInAppBrand`)
- Modify: `scripts/build.mjs` (badge statique par site/locale dans le header vitrine — le pays d'un build vitrine est connu statiquement)
- Test: `tests/country-indicator.test.mjs` (create)

**Step 1: Test qui échoue**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderInAppBrand } from '../App/components/in-app-brand.mjs';

test('le brand app affiche le pays actif', () => {
  const be = renderInAppBrand({ countryCode: 'BE' });
  assert.match(be, /🇧🇪/);
  assert.match(be, /Belgique/);
  const cd = renderInAppBrand({ countryCode: 'CD' });
  assert.match(cd, /🇨🇩/);
  assert.match(cd, /RDC/);
});
```

**Step 2:** FAIL. **Step 3:** Implémenter le badge (`<a class="app-brand__country" href="#buy" aria-label="Marché actif : …">🇨🇩 <span>RDC</span></a>`), styles dans `App/app.css` (pill compact, 24px de haut). Vitrine : badge non interactif dans `site-header__inner`, alimenté par la locale du build. Ne pas casser la signature existante (`{ compact }`).

**Step 4:** PASS + `npm run smoke:app`. **Step 5: Commit** — `feat(app,site): active country flag badge in headers`

---

### Task 6: Wording — supprimer le jargon interne (quick-win)

**Files:**
- Modify: `App/features/home/home-screen.mjs:54` (`Seller-first` → supprimer le badge)
- Modify: `App/features/home/buy-screen.mjs:57` (`Live beta` → supprimer)
- Modify: `App/features/auth/welcome-screen.mjs:17,30` (`portefeuille test` → `portefeuille`, phrase générique)
- Modify: `App/features/wallet/wallet-screen.mjs:37-38` (`portefeuille test` / `solde bêta` → `Activez votre portefeuille` / `La vérification ouvre votre solde et les transactions de boost.`)
- Modify: `App/features/profile/profile-screen.mjs:322` (idem)
- Modify: `App/features/post/capture-screen.mjs:125` (`Utilisez une vraie photo depuis votre appareil.` → `Prenez l'objet en photo, ou choisissez une image de votre galerie.`)
- Test: `tests/ui-wording.test.mjs` (create)

**Step 1: Test qui échoue**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs'; // Node ≥22 ; sinon lister les fichiers explicitement

const files = [
  'App/features/home/home-screen.mjs',
  'App/features/home/buy-screen.mjs',
  'App/features/auth/welcome-screen.mjs',
  'App/features/wallet/wallet-screen.mjs',
  'App/features/profile/profile-screen.mjs',
  'App/features/post/capture-screen.mjs',
];

test('aucun jargon interne dans les écrans utilisateur', () => {
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    assert.doesNotMatch(src, /Seller-first|Live beta|portefeuille test|solde bêta|vraie photo/i, file);
  }
});
```

**Step 2:** FAIL. **Step 3:** Appliquer les remplacements ci-dessus (supprimer les badges plutôt que les renommer — moins d'éléments). Adapter les tests existants qui attendent ces chaînes (`git grep -l 'Seller-first\|Live beta' tests/`).

**Step 4:** `npm test` → PASS. **Step 5: Commit** — `fix(app): remove internal jargon from user-facing copy`

---

### Task 7: Tri et filtre prix par devise sur /annonces (moyen)

`src/site/app.js:256-259` trie `Number(dataset.price)` toutes devises confondues (73 annonces USD vs 87 CDF en prod) ; le filtre « 0 – 100 000 CDF » attrape les montants USD.

**Files:**
- Modify: `scripts/build.mjs` (cartes annonces : émettre `data-currency="CDF|USD|EUR"` — la devise est déjà dans les données de listing du build live)
- Modify: `src/site/app.js:250-270` (tri : primaire = devise du site [CDF pour fr-cd, EUR pour be], secondaire = montant ; filtre prix : n'appliquer les bornes CDF qu'aux cartes CDF, et ajouter l'équivalent « autres devises » non filtré plutôt qu'un faux classement)
- Test: `tests/listing-sort-currency.test.mjs` (create)

**Step 1: Test qui échoue** — extraire la logique de tri dans une fonction pure exportée pour la tester :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareListingsByPrice } from '../src/site/listing-sort.mjs';

test('le tri croissant groupe par devise locale d’abord, puis par montant', () => {
  const cards = [
    { price: 1, currency: 'USD' },
    { price: 1000, currency: 'CDF' },
    { price: 25000, currency: 'CDF' },
    { price: 5, currency: 'USD' },
  ];
  const sorted = [...cards].sort((a, b) => compareListingsByPrice(a, b, { localCurrency: 'CDF', direction: 'asc' }));
  assert.deepEqual(sorted.map((c) => `${c.price} ${c.currency}`), ['1000 CDF', '25000 CDF', '1 USD', '5 USD']);
});
```

**Step 2:** FAIL (module absent). **Step 3:** Créer `src/site/listing-sort.mjs` (fonction pure), l'importer dans `src/site/app.js`, lire `dataset.currency`. Le build copie déjà `src/site/app.js` vers `dist/assets/app.js` — vérifier que le module est inliné ou copié aussi (suivre le mécanisme existant du build pour `app.js`). Filtre prix : `matchesPrice` ne s'applique qu'aux cartes dont `currency === localCurrency` ; les autres restent visibles sauf si un filtre prix est actif → les masquer avec un compteur « N annonces en autre devise masquées » est hors scope, choisir : cartes autres devises exclues quand un filtre prix est actif (comportement le plus honnête, le documenter dans le code).

**Step 4:** PASS + vérif manuelle preview sur /annonces/. **Step 5: Commit** — `fix(site): currency-aware price sort and filter`

---

### Task 8: Attribut capture + refus HEIC à l'upload (moyen)

`App/features/post/capture-screen.mjs:128-132` : input `accept="image/*"` sans `capture` (le bouton « Prendre une photo » ouvre la galerie) ; et une photo `.heic` existe en prod (non affichable par les navigateurs) — `App/services/image-compression.mjs` ne gère pas ce cas.

**Files:**
- Modify: `App/features/post/capture-screen.mjs:128-132` (ajouter `capture="environment"`)
- Modify: `App/services/image-compression.mjs` (toujours ré-encoder la sortie en JPEG via canvas — si c'est déjà le cas, ajouter un test qui le prouve pour un input nommé `.heic` ; si le décodage HEIC échoue dans le navigateur, rejeter avec un message clair « Format non pris en charge, utilisez une photo JPEG »)
- Test: `tests/capture-input.test.mjs` (create)

**Step 1: Test qui échoue**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test("l'input photo demande la caméra arrière", () => {
  const src = readFileSync('App/features/post/capture-screen.mjs', 'utf8');
  assert.match(src, /capture="environment"/);
});
```

**Step 2:** FAIL. **Step 3:** Ajouter l'attribut ; inspecter `image-compression.mjs` : si le pipeline dessine sur canvas et exporte `toBlob('image/jpeg')`, la sortie est déjà JPEG (le `.heic` prod vient alors d'un autre chemin d'upload — le noter dans le commit et traiter le nettoyage dans Task 9) ; sinon forcer l'export JPEG. Note : ne PAS ajouter `multiple` — le flux « une photo d'abord » est un choix produit assumé (« Commencez par une seule photo »).

**Step 4:** `npm test` → PASS. **Step 5: Commit** — `fix(app): camera capture attribute, guaranteed jpeg output`

---

### Task 9: Script de purge des données de test en prod (moyen, apps/api)

Le feed RDC contient : slugs `e2e-*` (11+), `zwibba-test-e2e-*`, 3× « Zwibba beta seller <ts> », 18 doublons « Samsung Galaxy A54 128 Go », « Mascotte Active Filters » boostée à 103 389 US$, vendeurs au numéro `+2439900000xx`, 1 photo `.heic`. Écrire un script Prisma idempotent, en dry-run par défaut.

**Files:**
- Create: `apps/api/scripts/purge-test-listings.ts`
- Test: `apps/api/src/listings/__tests__/purge-test-listings.spec.ts` (suivre la convention de tests existante du repo — vérifier avec `ls apps/api/src/**/__tests__` et adapter le chemin)

**Step 1: Test qui échoue** — tester la fonction de sélection pure (pas la DB) :

```ts
import { isTestListing } from '../../../scripts/purge-test-listings';

describe('isTestListing', () => {
  it('flags e2e and beta seller artifacts', () => {
    expect(isTestListing({ slug: 'e2e-galaxy-1774525973423', title: '', sellerPhone: '' })).toBe(true);
    expect(isTestListing({ slug: 'x', title: 'Zwibba beta seller 1781344475607', sellerPhone: '' })).toBe(true);
    expect(isTestListing({ slug: 'x', title: 'ok', sellerPhone: '+243990000002' })).toBe(true);
  });
  it('keeps real listings and belgian seeds', () => {
    expect(isTestListing({ slug: 'piano-numerique-korg-b2', title: 'Piano numérique KORG B2', sellerPhone: '+32470000000' })).toBe(false);
  });
});
```

**Step 2:** FAIL. **Step 3:** Implémenter : `isTestListing` (patterns : `/^e2e-/`, `/zwibba-test/`, `/zwibba beta seller/i`, `/verification-live/`, tél `/^\+243990{5,}/`) + `main()` Prisma qui liste (dry-run) puis supprime avec `--apply`, marque `status: 'archived'` plutôt que hard-delete si le schéma le permet (vérifier `apps/api/prisma/schema.prisma`). Les doublons Galaxy A54 : garder le plus récent, archiver le reste (groupé par titre normalisé + vendeur). NE PAS toucher aux seeds belges (`apps/api/src/listings/belgian-seed-listings.ts`) ni aux `system-seeded-listings.ts` — les exclure par slug connu.

**Step 4:** `pnpm -C apps/api test` → PASS. **Step 5: Commit** — `chore(api): idempotent purge script for test listings (dry-run first)`

**Note d'exécution prod (après merge, par Yves) :** `railway run --service api -- npx tsx scripts/purge-test-listings.ts` (dry-run, vérifier la liste) puis `--apply`. Toujours confirmer l'environnement avant (`railway status`).

---

### Task 10: Cohérence des textes vitrine (mineur, groupé)

**Files:**
- Modify: `src/site/locales/fr-cd.mjs:93` (`Dix univers clés` → `Seize univers clés` — ou mieux : `Les catégories qui suivent le marché local.` pour ne plus compter)
- Modify: `scripts/build.mjs` (label « 10 CATÉGORIES » au-dessus des chips → le calculer : `${categories.length} catégories` ; badge `Booste` → `Boosté`)
- Test: étendre `tests/build.test.mjs` d'une assertion

**Step 1: Test qui échoue**

```js
test('les compteurs de catégories reflètent les données', () => {
  const html = readFileSync('dist/annonces/index.html', 'utf8');
  assert.doesNotMatch(html, /10 catégories/i);
  assert.doesNotMatch(readFileSync('dist/index.html', 'utf8'), /Dix univers/);
  assert.doesNotMatch(readFileSync('dist/index.html', 'utf8'), />Booste</);
});
```

**Step 2:** FAIL. **Step 3:** Appliquer. **Step 4:** `npm test` → PASS. **Step 5: Commit** — `fix(site): category counts and accents match data`

---

## Hors scope de ce plan (assumé, ne pas faire)

- **Pagination /annonces + hero compact** : refonte plus large de la page browse, à traiter dans un plan dédié avec le SEO (pages crawlables).
- **Doctrine contact (WhatsApp exposé vs OTP)** : décision produit à trancher par Yves avant tout code.
- **Sécurité API (CORS, /moderation/queue, rate-limit OTP)** : signalé par l'analyse Codex, plan sécurité séparé.
- **Bundling des ~60 modules ESM** : la Task 1 (fingerprint + SW versionné) règle l'incohérence de versions ; le bundling est une optimisation à mesurer ensuite.
- **Témoignages home + annonces démo figées** : dépend de contenu réel à collecter, pas de code.

## Vérification finale (après déploiement Railway)

1. `curl -sI https://zwibba.com/assets/app/app.js?v=<build>` → `immutable` ; `curl -sI https://zwibba.com/App/` → `no-cache`.
2. Recharger zwibba.com 2× (SW) puis vérifier : hamburger visible en mobile, skip-link caché, aucun lien Play Store, badge pays visible, « Boosté » accentué.
3. `/App/#buy` : recherche « piano » → 1 résultat ; badge 🇨🇩 ; basculer Belgique → badge 🇧🇪 et `#phone` pré-rempli `+32`.
4. Feed RDC : plus aucun slug `e2e-*` ni « beta seller » (après exécution du purge en prod).
