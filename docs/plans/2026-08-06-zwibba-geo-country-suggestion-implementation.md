# Zwibba Geo Country Suggestion (P2) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bannière de suggestion de marché pour les visiteurs belges anonymes, pilotée par `cf-ipcountry` (cookie `zwibba_geo` posé par `server.mjs`), avec préférence persistée et sélecteur de marché réversible — jamais de redirection.

**Architecture:** Helpers purs `shared/geo-country.mjs` (lecture en-tête + fabrication du cookie) branchés dans `server.mjs` ; côté App, service `App/services/country-preference.mjs` (clé `zwibba_app_country`, pattern storage injecté), bannière `App/components/country-banner.mjs`, et résolution unique du pays de navigation dans `App/app.js` : session > préférence > `'CD'`.

**Tech Stack:** Node HTTP nu (`server.mjs`), vanilla JS ESM sans bundler, node:test (`node --test tests/*.test.mjs`).

---

### Task 1: Indexer la paire de plans

**Files:**
- Modify: `docs/plans/README.md`

1. Ajouter `2026-08-06-zwibba-geo-country-suggestion-design.md` et `-implementation.md` à la fin de la liste, même format que les entrées existantes (les deux fichiers existent déjà, non commités — les inclure dans le commit).
2. Vérifier : `grep geo-country docs/plans/README.md` → les deux lignes apparaissent.
3. Commit : `git commit -m "docs: index geo-country-suggestion plans"`

### Task 2: Helpers géo partagés

**Files:**
- Create: `shared/geo-country.mjs`
- Test: `tests/geo-country.test.mjs`

1. Test qui échoue :

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGeoCookie, resolveGeoCountry } from '../shared/geo-country.mjs';

test('resolveGeoCountry reads a valid cf-ipcountry header', () => {
  assert.equal(resolveGeoCountry({ 'cf-ipcountry': 'BE' }), 'BE');
  assert.equal(resolveGeoCountry({ 'cf-ipcountry': 'cd' }), 'CD');
});

test('resolveGeoCountry rejects missing or malformed values', () => {
  assert.equal(resolveGeoCountry({}), null);
  assert.equal(resolveGeoCountry({ 'cf-ipcountry': 'XX1' }), null);
  assert.equal(resolveGeoCountry({ 'cf-ipcountry': 'T1' }), null);
  assert.equal(resolveGeoCountry(undefined), null);
});

test('buildGeoCookie produces a readable functional cookie', () => {
  assert.equal(
    buildGeoCookie('BE'),
    'zwibba_geo=BE; Path=/; Max-Age=86400; SameSite=Lax',
  );
});
```

2. `node --test tests/geo-country.test.mjs` → FAIL (module introuvable).
3. Implémenter `shared/geo-country.mjs` :

```js
const GEO_COOKIE_NAME = 'zwibba_geo';
const GEO_COOKIE_MAX_AGE_SECONDS = 86400;

export function resolveGeoCountry(headers) {
  const rawValue = headers?.['cf-ipcountry'];
  const normalized = typeof rawValue === 'string' ? rawValue.trim().toUpperCase() : '';

  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function buildGeoCookie(countryCode) {
  return `${GEO_COOKIE_NAME}=${countryCode}; Path=/; Max-Age=${GEO_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
```

(Pas de `HttpOnly` : l'App lit ce cookie via `document.cookie` — choix volontaire, le documenter en commentaire dans le fichier.)
4. `node --test tests/geo-country.test.mjs` → PASS.
5. Commit : `git commit -m "feat(server): add shared geo country helpers"`

### Task 3: server.mjs pose le cookie géo

**Files:**
- Modify: `server.mjs`

1. Importer `resolveGeoCountry` et `buildGeoCookie` depuis `./shared/geo-country.mjs`. Dans le handler unique de `createServer`, à l'endroit où les en-têtes d'une réponse **HTML** sont posés (là où le `Content-Type` HTML est résolu — même logique pour la page statique et pour la page annonce dynamique `renderDynamicListingPage`) :

```js
const geoCountry = resolveGeoCountry(request.headers);

if (geoCountry) {
  response.setHeader('Set-Cookie', buildGeoCookie(geoCountry));
}
```

Ne rien changer aux réponses non-HTML (assets, JSON) ni au comportement quand l'en-tête est absent (dev local sans Cloudflare : aucun cookie).
2. Vérifier : `node --check server.mjs` → exit 0 ; `npm run build` → exit 0 ; puis test manuel local : `node server.mjs &` et `curl -sI -H "cf-ipcountry: BE" http://127.0.0.1:8080/ | grep -i set-cookie` → `Set-Cookie: zwibba_geo=BE; …` (adapter le port au `PORT` par défaut du serveur), et le même curl **sans** l'en-tête → aucun `Set-Cookie`. Tuer le serveur après.
3. Commit : `git commit -m "feat(server): set geo country cookie from cloudflare header"`

### Task 4: Service de préférence de pays (App)

**Files:**
- Create: `App/services/country-preference.mjs`
- Test: `tests/country-preference.test.mjs`

1. Test qui échoue :

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCountryPreference,
  readGeoCountry,
} from '../App/services/country-preference.mjs';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('stores and normalizes the browse country', () => {
  const preference = createCountryPreference({ storage: createMemoryStorage() });
  assert.equal(preference.getStoredCountry(), null);
  preference.setStoredCountry('BE');
  assert.equal(preference.getStoredCountry(), 'BE');
  preference.setStoredCountry('FR');
  assert.equal(preference.getStoredCountry(), 'BE');
});

test('readGeoCountry extracts zwibba_geo from a cookie string', () => {
  assert.equal(readGeoCountry('foo=1; zwibba_geo=BE; bar=2'), 'BE');
  assert.equal(readGeoCountry('zwibba_geo=CD'), 'CD');
  assert.equal(readGeoCountry('foo=1'), null);
  assert.equal(readGeoCountry(undefined), null);
});
```

2. `node --test tests/country-preference.test.mjs` → FAIL.
3. Implémenter (même pattern d'injection `storage` que `App/services/auth-service.mjs`, avec try/catch autour des accès storage comme le fait ce service) :

```js
const STORAGE_KEY = 'zwibba_app_country';

function normalizeStoredCountry(value) {
  return value === 'BE' || value === 'CD' ? value : null;
}

export function createCountryPreference({ storage }) {
  return {
    getStoredCountry() {
      try {
        return normalizeStoredCountry(storage.getItem(STORAGE_KEY));
      } catch {
        return null;
      }
    },
    setStoredCountry(countryCode) {
      const normalized = normalizeStoredCountry(countryCode);

      if (!normalized) {
        return;
      }

      try {
        storage.setItem(STORAGE_KEY, normalized);
      } catch {
        // stockage indisponible : préférence non persistée, sans erreur
      }
    },
  };
}

export function readGeoCountry(cookieString) {
  const match = /(?:^|;\s*)zwibba_geo=([A-Z]{2})(?:;|$)/.exec(cookieString ?? '');

  return match ? match[1] : null;
}
```

4. `node --test tests/country-preference.test.mjs` → PASS.
5. Commit : `git commit -m "feat(app): add browse country preference service"`

### Task 5: Bannière de suggestion Belgique

**Files:**
- Create: `App/components/country-banner.mjs`
- Modify: `App/app.js` (rendu conditionnel dans `renderApp`, instanciation du service, actions déléguées)
- Modify: la feuille de style de l'App (même fichier que les styles existants des composants App)
- Test: `tests/country-banner.test.mjs`

1. Test qui échoue :

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { renderCountrySuggestionBanner } from '../App/components/country-banner.mjs';

test('renders the belgian suggestion with both delegated actions', () => {
  const html = renderCountrySuggestionBanner();
  assert.match(html, /Belgique/);
  assert.match(html, /data-action="accept-country-suggestion"/);
  assert.match(html, /data-action="dismiss-country-suggestion"/);
});
```

2. `node --test tests/country-banner.test.mjs` → FAIL.
3. Implémenter le composant :

```js
export function renderCountrySuggestionBanner() {
  return `
    <aside class="country-banner" role="status">
      <p class="country-banner__text">Vous êtes en Belgique ? Découvrez les annonces Zwibba Belgique.</p>
      <div class="country-banner__actions">
        <button class="country-banner__button country-banner__button--primary" type="button" data-action="accept-country-suggestion">Voir la Belgique</button>
        <button class="country-banner__button" type="button" data-action="dismiss-country-suggestion">Rester sur la RDC</button>
      </div>
    </aside>
  `;
}
```

Dans `App/app.js` : instancier `const countryPreference = createCountryPreference({ storage: window.localStorage });` à côté des autres services ; ajouter

```js
function shouldShowCountrySuggestion() {
  return (
    !state.session &&
    !countryPreference.getStoredCountry() &&
    readGeoCountry(document.cookie) === 'BE'
  );
}
```

et appender `renderCountrySuggestionBanner()` à la sortie de `renderApp` quand la condition est vraie (même mécanisme d'append que la feuille de partage `state.shareMenu`). Dans le délégateur `data-action` : `accept-country-suggestion` → `countryPreference.setStoredCountry('BE')` puis rechargement du flux acheteur et `renderApp()` ; `dismiss-country-suggestion` → `countryPreference.setStoredCountry('CD')` puis `renderApp()`. Styles : bannière fixe en bas, au-dessus de la tab bar, mêmes tokens visuels que les composants App existants.
4. `node --test tests/country-banner.test.mjs && node --check App/app.js && node scripts/build.mjs` → PASS.
5. Commit : `git commit -m "feat(app): add belgian market suggestion banner"`

### Task 6: Résolution du pays de navigation + sélecteur de marché

**Files:**
- Modify: `App/app.js` (`loadBuyerFeed`, nouvelle `resolveBrowseCountry`, action `set-browse-country`)
- Modify: l'écran Acheter (`renderBuyScreen`, sous `App/features/home/`) — sélecteur de marché
- Test: `tests/app-buyer-routing.test.mjs` (compléter) et le test existant de l'écran Acheter

1. Tests : (a) dans le test de routing acheteur, un état **sans session** mais avec préférence stockée `BE` charge le flux avec `countryCode: 'BE'` ; sans session ni préférence → `'CD'` ; avec session `+243…` et préférence `BE` → la session gagne (`'CD'`). (b) le rendu de l'écran Acheter sans session contient `data-action="set-browse-country"` avec `data-country="CD"` et `data-country="BE"` (et l'option active marquée) ; avec session, le sélecteur est absent.
2. `node --test tests/*.test.mjs` → FAIL.
3. Implémenter dans `App/app.js` :

```js
function resolveBrowseCountry() {
  if (state.session) {
    return resolvePhoneCountry(state.session.phoneNumber);
  }

  return countryPreference.getStoredCountry() ?? 'CD';
}
```

`loadBuyerFeed` remplace son calcul actuel (`resolvePhoneCountry(state.session?.phoneNumber)`) par `resolveBrowseCountry()`. Action déléguée `set-browse-country` : `countryPreference.setStoredCountry(trigger.dataset.country)` puis rechargement du flux + `renderApp()`. Dans `renderBuyScreen`, quand l'appelant n'a pas de session, rendre le sélecteur :

```js
`<div class="buy-market-switch" role="group" aria-label="Marché">
  <button type="button" data-action="set-browse-country" data-country="CD" ${activeCountry === 'CD' ? 'aria-pressed="true"' : ''}>RDC</button>
  <button type="button" data-action="set-browse-country" data-country="BE" ${activeCountry === 'BE' ? 'aria-pressed="true"' : ''}>Belgique</button>
</div>`
```

(le pays actif est passé par `renderRoute` depuis `resolveBrowseCountry()` — suivre la signature existante de `renderBuyScreen` pour l'ajout du paramètre).
4. Vérification finale complète : `node --test tests/*.test.mjs` → tous PASS (aucune régression sur les 325 existants), `node --check App/app.js`, `node scripts/build.mjs`, `npm run smoke:monorepo` → exit 0.
5. Commit : `git commit -m "feat(app): wire browse country preference and market selector"`
