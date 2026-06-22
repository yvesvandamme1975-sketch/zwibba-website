# Zwibba Production Fail-Closed Hardening Design

**Date:** 2026-06-22

## Goal

Donner de vraies dents au durcissement fail-closed des trois services Zwibba en production Railway, où `NODE_ENV` n est pas systematiquement pose, et fermer le fallback silencieux vers le secret admin public par defaut.

## Problem

Le durcissement de Phase 0 (`shared/api-base-url.mjs`) ne fail-close que si `NODE_ENV === production`. Or le service website Railway ne pose pas `NODE_ENV` (il expose `RAILWAY_ENVIRONMENT=production`). Le garde-fou est donc inerte en prod reelle ; seule la variable `ZWIBBA_API_BASE_URL` posee manuellement protege.

Cote `apps/api/src/config/env.ts`, `isProductionEnv` ne regarde que `NODE_ENV`. Le service api pose `NODE_ENV`, donc son strict-prod marche, mais le code n a aucun filet si `NODE_ENV` venait a manquer.

Cote `apps/admin/src/config/env.ts`, il n existe aucune notion de production : `readRequiredString` retombe toujours sur `defaultEnvValues`, dont `ZWIBBA_ADMIN_SHARED_SECRET = zwibba-admin-secret` (secret public connu). La variable est posee en prod aujourd hui, donc pas d exposition actuelle, mais tout service admin demarre sans la variable se protege avec un secret public — fallback silencieux dangereux.

## Non-Goals

- Pas de rate-limiting OTP (Phase 1b, ajoute une dependance @nestjs/throttler).
- Pas d expiration de session (Phase 1b, touche le guard et le chemin de requete).
- Pas de restriction CORS (Phase 1b, risque de casser la PWA live, requiert un smoke cross-origin).
- Aucune migration Prisma, aucune nouvelle dependance.
- Ne change pas le comportement en developpement (defauts de confort conserves hors production).

## Existing System

`shared/api-base-url.mjs` exporte `resolveApiBaseUrl(env)` qui throw si `env.NODE_ENV === production` et que `ZWIBBA_API_BASE_URL` manque (teste par `tests/api-base-url.test.mjs`, runner racine `node --test`).

`apps/api/src/config/env.ts` definit `isProductionEnv(source)` = `(source.NODE_ENV ?? development) === production`, utilise par tous les `readRequiredString`/`readOptionalString`/`readPort`/`readOtpProvider`/`readAiProvider`/`readBooleanFlag`. Teste par `apps/api/test/config/env.test.ts` (runner `node ./scripts/run-tests.mjs`, `node:test`).

`apps/admin/src/config/env.ts` definit `loadAdminEnv(source)` sans notion de production ; `readRequiredString` fait `source[key] ?? defaultEnvValues[key]`. Pas de test env admin existant (`apps/admin/test/` ne contient que `moderation-page.test.ts`).

## Recommended Architecture

### 1. Re-key du resolveur website sur RAILWAY_ENVIRONMENT

Dans `shared/api-base-url.mjs`, considerer la production si `env.NODE_ENV === production` OU `env.RAILWAY_ENVIRONMENT === production`. Le throw fail-closed se declenche alors en prod Railway meme sans `NODE_ENV`.

### 2. Re-key de isProductionEnv (apps/api)

Dans `apps/api/src/config/env.ts`, `isProductionEnv` renvoie vrai si `NODE_ENV === production` OU `RAILWAY_ENVIRONMENT === production`. Defense en profondeur : le strict-prod de l api tient meme si `NODE_ENV` disparaissait.

### 3. Secret admin fail-closed (apps/admin)

Dans `apps/admin/src/config/env.ts`, ajouter une detection de production (`NODE_ENV === production` OU `RAILWAY_ENVIRONMENT === production`). En production, `ZWIBBA_ADMIN_SHARED_SECRET` devient strictement requis (pas de fallback) et la valeur par defaut publique `zwibba-admin-secret` est rejetee avec une erreur explicite. Hors production, le comportement de confort est conserve.
