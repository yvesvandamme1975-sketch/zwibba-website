# Zwibba AI Draft Guardrails Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verrouiller `POST /ai/draft` sur les photos du CDN R2 (anti-SSRF), limiter le débit par IP (5 brouillons / 15 min) et plafonner la dépense AI globale par jour (`AI_DRAFT_DAILY_LIMIT`, défaut 500) avec dégradation en `manual_fallback`, sans toucher au flux anonyme ni au front.

**Architecture:** Un nouveau module de fonctions pures `apps/api/src/ai/ai-draft-guardrails.ts` (validation d'URL CDN, résolution d'IP client via `x-forwarded-for`, helpers de fenêtre glissante, constantes, token d'injection du base URL) sur le modèle de `src/auth/otp-rate-limit.ts`. Un service stateful en mémoire `apps/api/src/ai/ai-draft-limiter.service.ts` (Map IP → timestamps purgée à chaque appel + compteur global par jour UTC) fourni par `AiModule` via factory `loadEnv()`. `AiController` vérifie dans l'ordre : `photoUrl` présente (existant) → verrou CDN (400) → rate limit IP (429) → plafond journalier (`manual_fallback` 200) → `AiService.generateDraft`. `AiService` et le front ne changent pas. `env.ts` gagne `ai.draftDailyLimit` lu depuis `AI_DRAFT_DAILY_LIMIT`, optionnel avec défaut 500 y compris en production (ne doit pas casser le deploy Railway existant).

**Tech Stack:** NestJS 11, TypeScript, custom node --test runner (`apps/api/scripts/run-tests.mjs`), supertest pour l'e2e.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the current docs list in `docs/plans/README.md`, after the `2026-08-14-zwibba-vitrine-live-listings-*` pair, before the "Legacy docs" trailer, keeping the blank-line separation between pairs:

```
- `2026-08-14-zwibba-ai-draft-guardrails-design.md`
- `2026-08-14-zwibba-ai-draft-guardrails-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "ai-draft-guardrails" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index ai-draft-guardrails plans"
```

---

### Task 2: Write the failing guardrail helpers test

**Files:**
- Create: `apps/api/test/ai/ai-draft-guardrails.test.ts`

**Step 1: Write the failing test**

Mirror the style of `apps/api/test/auth/otp-rate-limit.test.ts` (`node:test` + `node:assert/strict`). Import from `../../src/ai/ai-draft-guardrails` (module inexistant à ce stade) :

- `isAllowedDraftPhotoUrl(photoUrl, publicBaseUrl)` — assert true pour `https://cdn.zwibba.example/draft-photos/capture/photo.jpg` avec base `https://cdn.zwibba.example` ; assert false pour : hôte piégé `https://cdn.zwibba.example.attacker.com/photo.jpg`, protocole `http://cdn.zwibba.example/photo.jpg`, URL interne `http://169.254.169.254/latest/meta-data`, chaîne non parsable `not-a-url`, et base avec slash final `https://cdn.zwibba.example/` qui doit rester true pour une URL CDN valide.
- `resolveClientIp(headers, socketAddress)` — assert que `{ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }` retourne `10.0.0.1` (dernière entrée, ajoutée par le proxy Railway) ; qu'un header absent retombe sur `socketAddress` ; qu'un header en tableau `['1.2.3.4', '10.0.0.1']` prend la dernière entrée de la dernière valeur ; que tout vide retourne `'unknown'`.
- `pruneDraftAttempts(timestamps, nowMs)` — assert que les timestamps plus vieux que `AI_DRAFT_RATE_WINDOW_MS` sont retirés et les récents conservés.
- `isDraftRateExceeded(count)` — false à `AI_DRAFT_RATE_MAX_REQUESTS - 1`, true à `AI_DRAFT_RATE_MAX_REQUESTS` et au-delà.
- Constantes : `AI_DRAFT_RATE_WINDOW_MS === 15 * 60 * 1000`, `AI_DRAFT_RATE_MAX_REQUESTS === 5`.

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npm test -- ai-draft-guardrails`
Expected: FAIL because `src/ai/ai-draft-guardrails.ts` does not exist yet (module resolution error).

**Step 3: Commit**

```bash
git add apps/api/test/ai/ai-draft-guardrails.test.ts
git commit -m "test: cover ai draft guardrail helpers"
```

---

### Task 3: Implement the guardrail helpers

**Files:**
- Create: `apps/api/src/ai/ai-draft-guardrails.ts`

**Step 1: Write the code**

Create the module with:

- `export const AI_DRAFT_RATE_WINDOW_MS = 15 * 60 * 1000;`
- `export const AI_DRAFT_RATE_MAX_REQUESTS = 5;`
- `export const AI_DRAFT_PHOTO_BASE_URL = 'AI_DRAFT_PHOTO_BASE_URL';` (token d'injection Nest, consommé en Task 9).
- `isAllowedDraftPhotoUrl(photoUrl: string, publicBaseUrl: string): boolean` — parse les deux chaînes avec `new URL(...)` dans un try/catch (false si parse impossible), exige `photoUrl` en `https:`, compare `origin` strictement, puis vérifie que le `pathname` de la photo commence par le `pathname` de la base normalisé avec un slash final. La comparaison d'origine stricte élimine `cdn.zwibba.example.attacker.com`.
- `resolveClientIp(headers: Record<string, string | string[] | undefined>, socketAddress?: string): string` — lit `headers['x-forwarded-for']`, prend la dernière valeur si tableau, split sur `,`, trim, prend la dernière entrée non vide ; sinon `socketAddress` trimé ; sinon `'unknown'`.
- `pruneDraftAttempts(timestamps: number[], nowMs: number, windowMs = AI_DRAFT_RATE_WINDOW_MS): number[]` — filtre les timestamps strictement plus vieux que `nowMs - windowMs`.
- `isDraftRateExceeded(count: number, max = AI_DRAFT_RATE_MAX_REQUESTS): boolean` — `count >= max`, même forme que `isOtpRequestRateExceeded` dans `src/auth/otp-rate-limit.ts`.

**Step 2: Run test to verify it passes**

Run: `cd apps/api && npm test -- ai-draft-guardrails`
Expected: PASS, all assertions green.

**Step 3: Commit**

```bash
git add apps/api/src/ai/ai-draft-guardrails.ts
git commit -m "feat: add ai draft guardrail helpers"
```

---

### Task 4: Write the failing limiter service test

**Files:**
- Create: `apps/api/test/ai/ai-draft-limiter.service.test.ts`

**Step 1: Write the failing test**

Import `AiDraftLimiterService` from `../../src/ai/ai-draft-limiter.service` (inexistant à ce stade). Le service se construit avec `new AiDraftLimiterService({ dailyLimit, now })` où `now` est une horloge injectée (fonction retournant une `Date`) pilotée par le test. Couvrir via `evaluateDraftRequest(ip)` qui retourne `'ok' | 'ip_rate_exceeded' | 'daily_cap_reached'` :

- 5 requêtes de la même IP dans la fenêtre → `'ok'` ; la 6e → `'ip_rate_exceeded'`.
- Avancer l'horloge de plus de `AI_DRAFT_RATE_WINDOW_MS` → la même IP repasse à `'ok'` (fenêtre glissante purgée).
- Deux IPs différentes ne partagent pas leur compteur de fenêtre.
- Avec `dailyLimit: 3` et des IPs toutes différentes, les 3 premières → `'ok'`, la 4e → `'daily_cap_reached'`.
- Avancer l'horloge au jour UTC suivant → le compteur global repart et la requête suivante → `'ok'`.
- Une requête refusée (`ip_rate_exceeded` ou `daily_cap_reached`) n'incrémente pas le compteur journalier.

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npm test -- ai-draft-limiter`
Expected: FAIL because `src/ai/ai-draft-limiter.service.ts` does not exist yet.

**Step 3: Commit**

```bash
git add apps/api/test/ai/ai-draft-limiter.service.test.ts
git commit -m "test: cover in-memory ai draft limiter"
```

---

### Task 5: Implement the limiter service

**Files:**
- Create: `apps/api/src/ai/ai-draft-limiter.service.ts`

**Step 1: Write the code**

Classe `AiDraftLimiterService` (décorée `@Injectable()` pour rester dans l'idiome NestJS du dossier) :

- Constructeur `{ dailyLimit, now = () => new Date() }` stocké en champs privés.
- État privé : `attemptsByIp: Map<string, number[]>`, `dailyCountDayKey: string`, `dailyCount: number`.
- `evaluateDraftRequest(ip: string)` : calcule `nowMs`, purge la liste de l'IP avec `pruneDraftAttempts` (supprime l'entrée de la Map si vide, mémoire bornée), teste `isDraftRateExceeded` → `'ip_rate_exceeded'` ; calcule la clé jour UTC (`toISOString().slice(0, 10)`), remet `dailyCount` à zéro si la clé a changé, teste `dailyCount >= dailyLimit` → `'daily_cap_reached'` ; sinon enregistre le timestamp pour l'IP, incrémente `dailyCount`, retourne `'ok'`.

**Step 2: Run test to verify it passes**

Run: `cd apps/api && npm test -- ai-draft-limiter`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/ai/ai-draft-limiter.service.ts
git commit -m "feat: add in-memory ai draft limiter service"
```

---

### Task 6: Write the failing env contract test

**Files:**
- Modify: `apps/api/test/config/env.test.ts`

**Step 1: Write the failing test**

Dans le test existant `loadEnv returns the validated production env contract`, ajouter `AI_DRAFT_DAILY_LIMIT: '250'` à la source et l'assertion `assert.equal(env.ai.draftDailyLimit, 250);` à côté des assertions `env.ai.*` existantes. Ajouter un nouveau test `loadEnv defaults the ai draft daily limit to 500 when unset` qui appelle `loadEnv` avec la même source de production **sans** `AI_DRAFT_DAILY_LIMIT` et assert `env.ai.draftDailyLimit === 500` — ce défaut doit tenir aussi en production pour ne pas casser le deploy Railway actuel. Ajouter un test qui assert que `loadEnv` avec `AI_DRAFT_DAILY_LIMIT: 'abc'` throw.

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npm test -- config/env`
Expected: FAIL because `ZwibbaEnv['ai']` has no `draftDailyLimit` property (TypeScript/assertion error).

**Step 3: Commit**

```bash
git add apps/api/test/config/env.test.ts
git commit -m "test: cover ai draft daily limit env contract"
```

---

### Task 7: Implement the env contract

**Files:**
- Modify: `apps/api/src/config/env.ts`

**Step 1: Write the code**

Ajouter `draftDailyLimit: number` au bloc `ai` de `ZwibbaEnv`. Ajouter `AI_DRAFT_DAILY_LIMIT: '500'` aux `defaultEnvValues`. Créer un lecteur sur le modèle de `readPort` : lire la valeur via `readOptionalString(source, 'AI_DRAFT_DAILY_LIMIT')` ; si `undefined`, retourner `500` (défaut valable aussi en production) ; sinon `Number(...)`, et throw `new Error('AI_DRAFT_DAILY_LIMIT must be a positive integer.')` si non entier positif. Brancher le résultat dans l'objet `ai` retourné par `loadEnv`.

**Step 2: Run test to verify it passes**

Run: `cd apps/api && npm test -- config/env`
Expected: PASS, including the two new tests.

**Step 3: Commit**

```bash
git add apps/api/src/config/env.ts
git commit -m "feat: add ai draft daily limit env value"
```

---

### Task 8: Write the failing end-to-end guardrail spec

**Files:**
- Modify: `apps/api/test/ai/ai-draft.e2e-spec.ts`

**Step 1: Write the failing test**

Dans les deux tests existants, remplacer les `photoUrl` en `https://pub.example.test/...` par le même chemin sur `https://cdn.zwibba.example/...` (la base R2 résolue par les défauts d'env en test). Ajouter deux tests :

- `ai draft endpoint rejects photos outside the zwibba cdn` : POST `/ai/draft` avec `photoUrl: 'https://evil.example.test/draft-photos/capture/photo.jpg'` → `.expect(400)`.
- `ai draft endpoint throttles repeated requests from one address` : sur une même app fraîche (le limiter est réinstancié par app), envoyer 5 POST valides sur `https://cdn.zwibba.example/...` puis assert que le 6e répond `429`.

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npm test -- ai-draft.e2e`
Expected: FAIL — the foreign-URL request still answers 201 instead of 400 and the sixth request still answers 201 instead of 429, because the controller is not wired yet. The two pre-existing tests (updated URLs) still pass.

**Step 3: Commit**

```bash
git add apps/api/test/ai/ai-draft.e2e-spec.ts
git commit -m "test: cover ai draft guardrails end to end"
```

---

### Task 9: Wire the guardrails into the AI module and controller

**Files:**
- Modify: `apps/api/src/ai/ai.module.ts`
- Modify: `apps/api/src/ai/ai.controller.ts`

**Step 1: Write the code**

Dans `ai.module.ts`, ajouter deux providers factory sur le modèle des factories existantes : `AI_DRAFT_PHOTO_BASE_URL` → `loadEnv().r2.publicBaseUrl`, et `AiDraftLimiterService` → `new AiDraftLimiterService({ dailyLimit: loadEnv().ai.draftDailyLimit })`.

Dans `ai.controller.ts` :

- Injecter `AiDraftLimiterService` et `@Inject(AI_DRAFT_PHOTO_BASE_URL) private readonly photoBaseUrl: string`.
- Ajouter `@Req() request` typé structurellement (comme dans `src/auth/session-auth.guard.ts`) : `{ headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }`.
- Après le contrôle existant de `photoUrl` vide, dans l'ordre :
  1. `!isAllowedDraftPhotoUrl(photoUrl, this.photoBaseUrl)` → `throw new BadRequestException("Cette photo ne provient pas d'un téléversement Zwibba.")`.
  2. `evaluateDraftRequest(resolveClientIp(request.headers, request.socket?.remoteAddress))` : si `'ip_rate_exceeded'` → `throw new HttpException('Trop de brouillons IA demandés. Réessayez dans quelques minutes.', 429)` (`HttpException` importé de `@nestjs/common`).
  3. Si `'daily_cap_reached'` → retourner directement `{ message: "L'IA n'a pas pu préparer ce brouillon. Continuez manuellement.", status: 'manual_fallback' }` (contrat existant d'`AiService`, statut HTTP 201 inchangé).
- Sinon, déléguer à `this.aiService.generateDraft(...)` comme aujourd'hui.

**Step 2: Run test to verify it passes**

Run: `cd apps/api && npm test -- ai-draft.e2e`
Expected: PASS — updated CDN URLs answer 201, foreign URL answers 400, sixth request answers 429.

**Step 3: Commit**

```bash
git add apps/api/src/ai/ai.module.ts apps/api/src/ai/ai.controller.ts
git commit -m "feat: enforce ai draft guardrails in controller"
```

---

### Task 10: Full API suite regression pass

**Files:**
- None (verification only)

**Step 1: Run the full API test suite**

Run: `cd apps/api && npm test`
Expected: PASS — no regression outside the AI module (auth, listings, media, chat, boost, config suites all green).

**Step 2: Run the monorepo smoke**

Run: `npm run smoke:monorepo` (from the repo root)
Expected: PASS.

**Step 3: Commit**

Skip the commit step for this task because no file was modified.
