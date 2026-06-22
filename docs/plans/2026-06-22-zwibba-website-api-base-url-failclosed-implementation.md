# Zwibba Website API Base URL Fail-Closed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Faire échouer le démarrage du service website en production quand `ZWIBBA_API_BASE_URL` manque, via un module pur testable ; versionner la config de déploiement Railway du service website en `railway.json` (deploy-only) ; clarifier la convention de branches dans `CLAUDE.md`.

**Architecture:** Un module pur `shared/api-base-url.mjs` exporte `resolveApiBaseUrl(env)` (valeur si présente, throw en production si absente, défaut en dev). `server.mjs` l'importe à la place du fallback en dur de la ligne 12. Un `railway.json` racine ajoute `healthcheckPath`/restart policy pour le service website sans toucher au build. Tests via le runner racine `node --test tests/*.test.mjs`, sur le modèle de `shared/listing-og.mjs` + `tests/listing-og.test.mjs`.

**Tech Stack:** Node.js ESM (`.mjs`), `node --test` (runner racine `npm test`), `node:assert`, config-as-code Railway (`railway.json`).

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the priority docs list in `docs/plans/README.md`, after the last existing entry (`2026-06-09-zwibba-simplify-success-share-implementation.md`) and before the "Legacy docs" trailer line:

```
- `2026-06-22-zwibba-website-api-base-url-failclosed-design.md`
- `2026-06-22-zwibba-website-api-base-url-failclosed-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "website-api-base-url-failclosed" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index website-api-base-url-failclosed plans"
```

---

### Task 2: Cover the API base URL resolver with a failing test

**Files:**
- Create: `tests/api-base-url.test.mjs`

**Step 1: Write the failing test**

Create `tests/api-base-url.test.mjs` importing `resolveApiBaseUrl` from `../shared/api-base-url.mjs` and asserting three behaviours:

- When `ZWIBBA_API_BASE_URL` is set, returns that value with any trailing slash removed (input `'https://api.example.com/'` → `'https://api.example.com'`).
- When `NODE_ENV === 'production'` and `ZWIBBA_API_BASE_URL` is absent, calling `resolveApiBaseUrl` throws an `Error` whose message contains `ZWIBBA_API_BASE_URL`.
- When `NODE_ENV` is not `'production'` (e.g. `'test'`) and the variable is absent, returns the dev default string `'https://api-production-b1b58.up.railway.app'`.

Pass an explicit env object to `resolveApiBaseUrl` in each case (do not mutate `process.env`). Use `node:test` (`test`, optionally `describe`) and `node:assert/strict`.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl } from '../shared/api-base-url.mjs';

test('returns the configured url without trailing slash', () => {
  assert.equal(
    resolveApiBaseUrl({ ZWIBBA_API_BASE_URL: 'https://api.example.com/' }),
    'https://api.example.com',
  );
});

test('throws in production when the url is missing', () => {
  assert.throws(
    () => resolveApiBaseUrl({ NODE_ENV: 'production' }),
    /ZWIBBA_API_BASE_URL/,
  );
});

test('falls back to the dev default outside production', () => {
  assert.equal(
    resolveApiBaseUrl({ NODE_ENV: 'test' }),
    'https://api-production-b1b58.up.railway.app',
  );
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/api-base-url.test.mjs`
Expected: FAIL because `../shared/api-base-url.mjs` does not exist yet (`ERR_MODULE_NOT_FOUND`).

**Step 3: Commit**

```bash
git add tests/api-base-url.test.mjs
git commit -m "test: cover website api base url resolution"
```

---

### Task 3: Implement the fail-closed resolver

**Files:**
- Create: `shared/api-base-url.mjs`

**Step 1: Write the module to make the test pass**

Create `shared/api-base-url.mjs` exporting `resolveApiBaseUrl(env = process.env)`:

- Read `env.ZWIBBA_API_BASE_URL`. If it is a non-empty string, return it with any trailing `/` stripped.
- Otherwise, if `env.NODE_ENV === 'production'`, throw `new Error('ZWIBBA_API_BASE_URL is required in production')`.
- Otherwise, return the dev default `'https://api-production-b1b58.up.railway.app'`.

No side effects at module scope (no top-level read of `process.env`, no server start), mirroring `shared/listing-og.mjs`.

**Step 2: Run test to verify it passes**

Run: `node --test tests/api-base-url.test.mjs`
Expected: PASS — all three subtests green.

**Step 3: Commit**

```bash
git add shared/api-base-url.mjs
git commit -m "feat: fail closed on missing website api base url in production"
```

---

### Task 4: Wire the website server to the shared resolver

**Files:**
- Modify: `server.mjs`

**Step 1: Replace the hardcoded fallback**

In `server.mjs`, add `import { resolveApiBaseUrl } from './shared/api-base-url.mjs';` alongside the existing `import { buildListingOgTags } from './shared/listing-og.mjs';`. Replace line 12:

```
const apiBaseUrl = process.env.ZWIBBA_API_BASE_URL || 'https://api-production-b1b58.up.railway.app';
```

with:

```
const apiBaseUrl = resolveApiBaseUrl(process.env);
```

Leave the rest of `server.mjs` unchanged (`fetchListing` keeps using `apiBaseUrl`).

**Step 2: Verify syntax and the full suite still pass**

Run: `node --check server.mjs && rg -n "resolveApiBaseUrl" server.mjs && npm test`
Expected: `node --check` prints nothing (valid syntax); `rg` shows the import line and the assignment; `npm test` reports all `tests/*.test.mjs` passing, including the new `api-base-url` test and the existing `listing-og` test.

**Step 3: Commit**

```bash
git add server.mjs
git commit -m "refactor: resolve website api base url via shared module"
```

---

### Task 5: Add a failing test for the Railway website config

**Files:**
- Create: `tests/railway-config.test.mjs`

**Step 1: Write the failing test**

Create `tests/railway-config.test.mjs` that reads `railway.json` at the repo root, parses it, and asserts:

- It is valid JSON.
- `deploy.healthcheckPath === '/'`.
- `deploy.restartPolicyType === 'ON_FAILURE'`.
- There is **no** `build` key (guard against accidentally overriding the build pipeline).

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const configPath = fileURLToPath(new URL('../railway.json', import.meta.url));

test('railway website config is deploy-only and health-checked', () => {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  assert.equal(config.deploy.healthcheckPath, '/');
  assert.equal(config.deploy.restartPolicyType, 'ON_FAILURE');
  assert.equal('build' in config, false);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/railway-config.test.mjs`
Expected: FAIL because `railway.json` does not exist yet (`ENOENT` on read).

**Step 3: Commit**

```bash
git add tests/railway-config.test.mjs
git commit -m "test: validate railway website config as code"
```

---

### Task 6: Add the Railway website config-as-code file

**Files:**
- Create: `railway.json`

**Step 1: Write the config to make the test pass**

Create `railway.json` at the repo root with deploy-only settings and no build section:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "deploy": {
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Step 2: Run test to verify it passes**

Run: `node --test tests/railway-config.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add railway.json
git commit -m "chore: add railway deploy config for website service"
```

---

### Task 7: Clarify the branch convention in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Write the clarification note**

In `CLAUDE.md` at the repo root, immediately after the existing paragraph that begins ``main` only carries the public-facing Railway landing (4 files).``, append a short note (additive, removes nothing):

```
> Note (2026-06-22): this is intentional. `main` stays the landing; `codex/website-vitrine-backup` stays the application trunk. A *local* `main` may drift to an app snapshot if features were merged locally — that is local noise, not a change of convention. Do not treat `main` as the trunk or push application code to it.
```

**Step 2: Verify the note is present**

Run: `rg -n "this is intentional" CLAUDE.md`
Expected: the new note line appears once.

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: clarify main is landing and codex is trunk"
```
