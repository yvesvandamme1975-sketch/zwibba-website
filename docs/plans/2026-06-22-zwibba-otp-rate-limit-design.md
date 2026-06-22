# Zwibba OTP Per-Phone Rate Limit Design

**Date:** 2026-06-22

## Goal

Limiter le nombre de demandes de code OTP par numero de telephone sur une fenetre glissante, pour bloquer l abus (cout SMS Twilio) et le brute-force, sans penaliser les utilisateurs legitimes derriere un meme IP.

## Problem

`apps/api/src/auth/auth.service.ts` (`requestOtp`) appelle `twilioVerifyService.requestVerification` (qui envoie un SMS en mode twilio) sans aucune limite. Un acteur malveillant peut declencher des centaines de SMS. Un throttle par IP serait dangereux : en RDC le CGNAT fait partager une meme IP a de nombreux utilisateurs mobiles, donc un throttle IP bloquerait des utilisateurs legitimes. La cle correcte est le numero de telephone.

## Non-Goals

- Pas de rate-limit par IP ni de @nestjs/throttler global.
- Pas de rate-limit sur verify-otp (Twilio Verify limite deja les essais de code cote serveur ; en mode demo l allowlist protege).
- Pas de nouvelle table : on reutilise `VerificationAttempt` (une ligne par demande, champ `createdAt`, index `[phoneNumber, status]`).
- Pas de changement du provider OTP.

## Existing System

`requestOtp(phoneNumber)` : valide le prefixe +243, appelle `requestVerification`, puis cree une ligne `VerificationAttempt { challengeId, phoneNumber, status }`. Le modele `VerificationAttempt` a `createdAt DateTime @default(now())`. Tests api : runner `node ./scripts/run-tests.mjs` (tsx + node:test) ; les helpers purs se testent sans base.

## Recommended Architecture

### 1. Politique de limite (module pur testable)

Nouveau `apps/api/src/auth/otp-rate-limit.ts` : `OTP_RATE_WINDOW_MS` (15 min), `OTP_RATE_MAX_REQUESTS` (5), `resolveOtpRateWindowStart(now, windowMs)` renvoie la borne basse de la fenetre, `isOtpRequestRateExceeded(count, max)` renvoie vrai si `count >= max`. Teste unitairement, sans base.

### 2. Application dans requestOtp

Avant l appel a `requestVerification` (donc avant tout SMS), `requestOtp` compte les `VerificationAttempt` du numero dans la fenetre (`where phoneNumber + createdAt >= resolveOtpRateWindowStart()`) et, si `isOtpRequestRateExceeded`, leve une `HttpException` 429 (`HttpStatus.TOO_MANY_REQUESTS`) avec un message FR clair. Sinon le flux continue normalement.
