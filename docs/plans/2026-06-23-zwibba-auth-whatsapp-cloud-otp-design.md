# Zwibba Auth WhatsApp Cloud OTP Design

**Date:** 2026-06-23

## Goal

Remplacer le provider OTP Twilio Verify par l'envoi direct via le WhatsApp Cloud API de Meta dans le module `auth`, en internalisant le cycle de vie de l'OTP (génération, stockage haché, expiration, vérification), tout en conservant le mode `demo` pour les tests et le développement.

## Problem

La validation de compte repose aujourd'hui sur **Twilio Verify**, un service géré qui **génère ET vérifie** le code à la place de Zwibba. `AuthService.requestOtp`/`verifyOtp` (`apps/api/src/auth/auth.service.ts`) délègue à `TwilioVerifyService` (`apps/api/src/auth/twilio-verify.service.ts`), qui a deux branches : `demo` (allowlist + code fixe) et `twilio` (HTTP vers `verify.twilio.com`, `Channel: 'sms'`). Le modèle `VerificationAttempt` ne stocke aucun code — il sert uniquement de journal et de base au rate-limit (`apps/api/src/auth/otp-rate-limit.ts`, 5 demandes / 15 min).

Twilio ne livre pas de façon fiable le SMS vers le +243 (RDC). Le Cloud API de Meta, lui, n'est qu'un **transport** : il envoie un template d'authentification contenant le code, mais ne le génère ni ne le vérifie. Basculer vers Meta transfère donc à Zwibba la responsabilité complète du cycle OTP : générer un code, le stocker de façon sécurisée (haché, avec expiration, plafond de tentatives, usage unique) et le vérifier localement. C'est un changement d'architecture, pas un simple échange d'URL. De plus, `TwilioVerifyService` est référencé dans 17 fichiers (3 sources + 14 specs e2e qui l'injectent en faux), ce qui impose un renommage maîtrisé.

## Non-Goals

- Pas de fallback SMS pour les utilisateurs sans WhatsApp : c'est un plan séparé (`auth-sms-fallback`). Ce plan couvre uniquement le canal WhatsApp + le mode demo.
- Pas de webhook de statut de livraison Meta : un envoi accepté (HTTP 2xx + `wamid`) suffit ; la livraison réelle n'est pas confirmée de façon synchrone.
- Pas de gestion multi-langue de template au-delà d'une langue paramétrable.
- Pas de modification du contrat front (`App/`) ni du flux d'authentification côté client : `request-otp`/`verify-otp` gardent leurs entrées/sorties.
- Pas de dépendance Redis : le stockage du challenge se fait en Postgres via Prisma.
- Pas de changement du modèle mobile Flutter (`apps/mobile/`).
- Pas de création automatisée du template Meta ni de la WABA : ces étapes (compte WhatsApp Business, vérification Meta Business, approbation du template d'authentification) sont réalisées manuellement par Yves hors code.

## Existing System

`AuthService` (`apps/api/src/auth/auth.service.ts`) : `requestOtp(phone)` valide le préfixe `+243`, applique le rate-limit en comptant les `VerificationAttempt` récents, appelle `twilioVerifyService.requestVerification(phone)` (retour `{ sid, status }`), crée un `VerificationAttempt` (`challengeId = sid`), et renvoie `{ challengeId, expiresInSeconds: 300, phoneNumber }`. `verifyOtp({ code, phoneNumber })` appelle `twilioVerifyService.checkVerification(...)`, et si `status === 'approved'` fait l'upsert `user`, sème le wallet demo (si provider `demo`), crée la `Session`, et marque les attempts `approved`.

`TwilioVerifyService` (`apps/api/src/auth/twilio-verify.service.ts`) : `requestVerification` et `checkVerification`, chacune avec une branche `demo` (allowlist `env.otp.demoAllowlist`, code `env.otp.demoCode`) et une branche `twilio` (HTTP Verify, auth Basic). Le contrôleur `AuthController` expose `POST /auth/request-otp` et `POST /auth/verify-otp`.

`env.ts` (`apps/api/src/config/env.ts`) : `type OtpProvider = 'demo' | 'twilio'` ; bloc `otp { demoAllowlist, demoCode, provider }` ; bloc optionnel `twilio { accountSid, authToken, verifyServiceSid }` requis seulement si provider `twilio` ; défaut `OTP_PROVIDER = 'twilio'`. Le modèle `VerificationAttempt` (`apps/api/prisma/schema.prisma`) : `id, challengeId, createdAt, phoneNumber, status, updatedAt`, `@@index([phoneNumber, status])`. Les 14 specs e2e sous `apps/api/test/` instancient un `_FakeTwilioVerifyService` et font `.overrideProvider(TwilioVerifyService)` pour booter `AppModule` sans appeler Twilio.

## Recommended Architecture

### 1. Renommer `TwilioVerifyService` en `OtpService` (sans changement de comportement)

Renommer le fichier `twilio-verify.service.ts` en `otp.service.ts` et la classe `TwilioVerifyService` en `OtpService`, en **conservant les signatures** `requestVerification(phone)` et `checkVerification({ code, phoneNumber })` pour limiter l'impact sur `AuthService`. Mettre à jour les 3 fichiers sources (`auth.module.ts`, `auth.service.ts`, le service lui-même) et les 14 specs e2e (`.overrideProvider(...)` et `_FakeTwilioVerifyService` → `_FakeOtpService`). Cette étape est purement mécanique : la suite reste verte avant toute logique Meta. Elle isole le renommage du changement fonctionnel.

### 2. Cycle de vie OTP local — modèle `OtpChallenge` et util pur

Internaliser la génération/vérification. Ajouter un util pur `apps/api/src/auth/otp-code.ts` : `generateOtpCode()` (6 chiffres), `hashOtpCode(code)` (hachage non réversible, ex. SHA-256 avec un sel applicatif ou bcrypt), et `verifyOtpCode(code, hash)` en comparaison à temps constant. Ajouter un modèle Prisma `OtpChallenge` (migration additive) : `id`, `phoneNumber`, `codeHash`, `expiresAt`, `attemptCount Int @default(0)`, `consumedAt DateTime?`, `createdAt`, `@@index([phoneNumber])`. `VerificationAttempt` reste inchangé (journal + rate-limit). Le code n'est **jamais** stocké en clair.

### 3. `OtpService` — génération, stockage, vérification

`OtpService.requestVerification(phone)` : générer le code (aléatoire en mode `meta`, `env.otp.demoCode` en mode `demo` après contrôle d'allowlist), créer un `OtpChallenge` (`codeHash`, `expiresAt = now + 5 min`), invalider les challenges antérieurs non consommés du numéro, et — en mode `meta` uniquement — déléguer l'envoi au `WhatsappOtpSender` (section 4). Renvoyer `{ sid: challenge.id, status: 'pending' }` pour préserver le contrat d'`AuthService`. `OtpService.checkVerification({ code, phoneNumber })` : charger le challenge actif le plus récent (non consommé, non expiré) ; si absent/expiré → `status: 'pending'`/échec ; incrémenter `attemptCount` ; au-delà du plafond (ex. 5 tentatives) invalider le challenge ; comparer via `verifyOtpCode` ; en cas de succès marquer `consumedAt` et renvoyer `{ status: 'approved' }`. Le mode `demo` suit exactement le même chemin local (code = `demoCode`), garantissant des tests déterministes sans appel externe.

### 4. `WhatsappOtpSender` — envoi via le Cloud API Meta

Ajouter un service injectable `apps/api/src/auth/whatsapp-otp.sender.ts` avec `sendAuthenticationCode({ phoneNumber, code })` : `POST https://graph.facebook.com/v{GRAPH_API_VERSION}/{PHONE_NUMBER_ID}/messages`, en-tête `Authorization: Bearer {ACCESS_TOKEN}`, corps `type: 'template'` ciblant le template d'authentification approuvé, avec le destinataire en E.164 **sans le `+`**. Le payload d'un template d'authentification WhatsApp exige **deux** composants paramétrés par le code : le `body` (`{{1}}` = code) **et** le bouton (copy-code / one-tap, `sub_type` selon le template, `index: '0'`, paramètre = code) — omettre le composant bouton est l'erreur classique qui fait rejeter l'appel. En cas de réponse non-2xx, lever une erreur claire sans divulguer le code. Le sender est injectable pour être remplacé par un faux en test ; en mode `demo` il n'est jamais appelé.

### 5. Configuration `env` — provider `meta`, suppression de `twilio`

Remplacer `type OtpProvider = 'demo' | 'twilio'` par `'demo' | 'meta'` et mettre le défaut `OTP_PROVIDER` à `demo` (sécurité dev/CI). Ajouter un bloc `meta` (requis seulement si provider `meta`) : `phoneNumberId`, `accessToken`, `templateName`, `templateLang`, `graphApiVersion`, lus depuis `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_TEMPLATE_NAME`, `META_WHATSAPP_TEMPLATE_LANG`, `META_GRAPH_API_VERSION`. Retirer le bloc `twilio` et les variables `TWILIO_*`. `readOtpProvider` accepte désormais `demo`|`meta`. Le mode `demo` conserve `demoAllowlist`/`demoCode`.

### 6. Câblage, sécurité et mise en production

`auth.module.ts` fournit `OtpService` et `WhatsappOtpSender`. `AuthService` ne change quasiment pas (mêmes appels `requestVerification`/`checkVerification`, rate-limit `VerificationAttempt` conservé, semis wallet gardé pour provider `demo`). Garanties de sécurité : code haché, TTL 5 min, plafond de tentatives puis invalidation, usage unique, pas de fuite du code dans les logs/erreurs. Mise en production Railway : définir `OTP_PROVIDER=meta` et les secrets `META_WHATSAPP_*`/`META_GRAPH_API_VERSION`, retirer les `TWILIO_*`. Prérequis hors code (réalisés par Yves) : WABA créée, vérification Meta Business, template d'authentification approuvé dans la langue ciblée.
