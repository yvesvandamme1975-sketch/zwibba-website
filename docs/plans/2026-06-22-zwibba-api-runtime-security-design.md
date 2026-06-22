# Zwibba API Runtime Security Design

**Date:** 2026-06-22

## Goal

Durcir le chemin de requete live de l API : expirer les sessions, limiter le debit des endpoints OTP, et restreindre le CORS a une liste blanche configurable — sans casser la PWA en production.

## Problem

`apps/api/src/auth/auth.service.ts` cree les sessions sans `expiresAt` (le champ Prisma existe mais reste null) et `findSessionToken` ne verifie aucune expiration : les jetons de session sont eternels.

Les endpoints `/auth/request-otp` et `/auth/verify-otp` (`auth.controller.ts`) n ont aucun rate-limiting : abus possible (cout SMS Twilio) et brute-force du code OTP.

`apps/api/src/main.ts` appelle `app.enableCors()` sans origine : le CORS est ouvert a tous.

## Non-Goals

- Pas de paiement reel / wallet (hors Phase 1).
- Pas de revocation explicite de session cote utilisateur (seulement l expiration par TTL).
- Pas de changement du provider OTP (demo vs twilio).
- Ne pas casser la PWA : l origine navigateur reelle est `https://website-production-7a12.up.railway.app` (le service website), PAS `APP_BASE_URL` (qui vaut l URL de l API elle-meme).

## Existing System

Session creee dans `auth.service.ts` (`prismaService.session.create({ data: { token, userId } })`) et validee par `findSessionToken` puis `SessionAuthGuard`. Modele Prisma `Session` a deja `expiresAt DateTime?`.

`app.module.ts` importe les modules sans ThrottlerModule. `main.ts` : `loadEnv()` puis `app.enableCors()` puis `app.listen(env.port)`.

Tests api : runner `node ./scripts/run-tests.mjs` (tsx + node:test). Les `*.e2e-spec.ts` requierent une base Postgres + @nestjs/testing et ne tournent pas hors environnement provisionne ; les helpers purs se testent sans base.

## Recommended Architecture

### 1. Expiration de session

Nouveau module pur `apps/api/src/auth/session-expiry.ts` : `SESSION_TTL_MS` (30 jours), `computeSessionExpiry(now)`, `isSessionExpired(session, now)`. `auth.service.ts` pose `expiresAt: computeSessionExpiry()` a la creation et `findSessionToken` renvoie null si `isSessionExpired(session)`. Helper teste unitairement sans base.

### 2. Rate-limiting OTP

Ajouter `@nestjs/throttler`. `app.module.ts` importe `ThrottlerModule.forRoot` avec une limite conservatrice et enregistre `ThrottlerGuard` en APP_GUARD global. Les endpoints OTP heritent de la limite ; verification au smoke post-deploy (rafale -> 429).

### 3. CORS liste blanche

Nouveau module pur `apps/api/src/config/allowed-origins.ts` : `resolveAllowedOrigins(env)` retourne la liste depuis `ZWIBBA_ALLOWED_ORIGINS` (CSV) ou, a defaut, une liste sure incluant `https://website-production-7a12.up.railway.app` et les origines localhost de dev. `main.ts` passe `{ origin }` a `enableCors`. Teste unitairement ; verifie par un smoke cross-origin post-deploy.
