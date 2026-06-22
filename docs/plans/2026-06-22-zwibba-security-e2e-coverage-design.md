# Zwibba Security E2E Coverage Design

**Date:** 2026-06-22

## Goal

Couvrir par des tests e2e les garde-fous de securite de Phase 1 (expiration de session, rate-limit OTP par numero) pour que la CI les protege contre toute regression silencieuse.

## Problem

Les helpers purs `session-expiry.ts` et `otp-rate-limit.ts` sont testes unitairement, mais leur integration dans le chemin de requete (`AuthService.findSessionToken` -> 401 sur session expiree ; `requestOtp` -> 429 au-dela de la limite) n etait couverte par aucun test e2e. Une regression de cablage passerait le gate CI.

## Non-Goals

- Pas de nouveau comportement applicatif : ajout de tests uniquement.
- Pas de test e2e du CORS (applique dans `main.ts` au bootstrap, hors module de test ; deja couvert unitairement par `allowed-origins.test.ts`).

## Existing System

Les specs e2e api (`apps/api/test/**/*.e2e-spec.ts`) montent `AppModule` via `@nestjs/testing`, surchargent `PrismaService` et `TwilioVerifyService` par des faux inline, et requetent via `supertest`. Runner : `node ./scripts/run-tests.mjs`.

## Recommended Architecture

### 1. session-expiry.e2e-spec.ts

Seede une session dans le faux Prisma avec un `expiresAt` controle, puis frappe l endpoint garde `GET /profile` : expiresAt passe -> 401 ; futur ou null -> 200.

### 2. otp-rate-limit.e2e-spec.ts

Rend `verificationAttempt.count` du faux controlable : count >= OTP_RATE_MAX_REQUESTS -> `POST /auth/request-otp` renvoie 429 (sans appel Twilio ni creation d attempt) ; count = 0 -> 201 normal.
