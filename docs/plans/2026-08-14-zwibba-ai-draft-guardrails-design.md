# Zwibba AI Draft Guardrails Design

**Date:** 2026-08-14

## Goal

Sécuriser l'endpoint public `POST /ai/draft` de `apps/api` sans casser le flux d'onboarding anonyme : verrouiller les URLs de photo sur le CDN R2 de Zwibba (anti-SSRF et anti-abus de crédits), limiter le débit par adresse IP, et plafonner la dépense AI globale par jour avec dégradation gracieuse en `manual_fallback`.

## Problem

Zwibba est en production et `POST /ai/draft` (`apps/api/src/ai/ai.controller.ts`) est aujourd'hui appelable par n'importe qui, sans authentification ni limite. Chaque appel déclenche la chaîne de providers configurée dans `apps/api/src/ai/ai.module.ts` — Gemini en tête, avec fallback Anthropic puis Mistral via `FallbackVisionDraftProvider`, plus l'enrichissement Google Cloud Vision quand `AI_GOOGLE_VISION_ENRICHMENT_ENABLED` est actif. Un script trivial en boucle peut donc épuiser les crédits des quatre providers.

Pire, `fetchPhotoAsBase64` dans `apps/api/src/ai/vision-provider-utils.ts` fait un `fetch` côté serveur de la `photoUrl` fournie telle quelle par le client. C'est une SSRF classique : un attaquant peut faire requêter par l'API des endpoints internes du réseau Railway ou des URLs arbitraires, et faire télécharger des payloads de taille quelconque.

Le point délicat côté produit : le flux « première photo → brouillon IA » tourne **avant** l'authentification. `createPostFlowController` dans `App/features/post/post-flow-controller.mjs` appelle `aiDraftService.generateDraft(uploadedPhoto)` sans session, et `decidePublishGate` n'exige la session qu'au moment de publier. Poser un `SessionAuthGuard` sur `/ai/draft` casserait l'onboarding signature de Zwibba. Décision actée avec Yves le 2026-08-14 : conserver le flux anonyme et sécuriser par des garde-fous.

## Non-Goals

- Exiger l'authentification (`SessionAuthGuard`) sur `POST /ai/draft` — le flux anonyme de première photo est conservé.
- Un store de rate limiting distribué (Redis, base Prisma) — l'API tourne en instance unique sur Railway, un état en mémoire suffit.
- Des quotas différenciés pour les utilisateurs connectés (le mode « hybride ») — à re-scoper si l'abus persiste.
- Le durcissement de `POST /media/upload-url` (`apps/api/src/media/media.controller.ts`), lui aussi anonyme et abusable pour du spam de stockage R2 — c'est un plan séparé à écrire.
- Des plafonds de facturation côté providers (consoles Gemini/Anthropic/Mistral/Google Cloud) — action manuelle de Yves, hors code.
- Le câblage de `apps/mobile/lib/services/ai_draft_api_service.dart` — l'app Flutter est un scaffold non déployé.

## Existing System

`apps/api/src/ai/ai.controller.ts` expose `POST /ai/draft`. Il valide uniquement que `photoUrl` est non vide (sinon `BadRequestException`) puis délègue à `AiService.generateDraft`. Aucun guard, aucun throttling, aucune validation d'origine de l'URL.

`apps/api/src/ai/ai.service.ts` orchestre le brouillon : appel du `VISION_DRAFT_PROVIDER`, enrichissement Google Vision optionnel, fusion (`google-hybrid-draft-fusion.ts`), désambiguïsation de catégorie, normalisation. Toute erreur interne est absorbée et retourne `{ status: 'manual_fallback', message: "L'IA n'a pas pu préparer ce brouillon. Continuez manuellement." }` — c'est le contrat de dégradation que le front connaît déjà.

`apps/api/src/ai/vision-provider-utils.ts` fournit `fetchPhotoAsBase64`, utilisé par les providers Gemini/Anthropic/Mistral pour télécharger la photo : `fetch(input.photoUrl)` sans aucune restriction d'hôte.

`apps/api/src/media/r2-storage.service.ts` construit les URLs publiques des photos téléversées comme `${env.r2.publicBaseUrl}/${objectKey}` (lignes 40 et 65). Le front (`App/features/post/post-flow-controller.mjs`, `uploadDraftPhoto`) renvoie ce `slot.publicUrl` tel quel comme `photoUrl` à `/ai/draft` via `App/services/ai-draft.mjs`. Toute photo légitime porte donc le préfixe `R2_PUBLIC_BASE_URL`.

`apps/api/src/config/env.ts` charge la config typée `ZwibbaEnv`, dont `r2.publicBaseUrl` et le bloc `ai`. En production les valeurs par défaut sont désactivées (fail-closed, pattern du plan `2026-06-22-zwibba-prod-failclosed-hardening`).

`apps/api/src/auth/otp-rate-limit.ts` est le précédent interne de rate limiting : constantes de fenêtre (`OTP_RATE_WINDOW_MS`, `OTP_RATE_MAX_REQUESTS`) et fonctions pures (`resolveOtpRateWindowStart`, `isOtpRequestRateExceeded`) testables avec le runner `node --test` custom (`apps/api/scripts/run-tests.mjs`).

`App/services/ai-draft.mjs` traite toute réponse non-`ok` en la convertissant en `manual_fallback` avec le message du serveur — un refus HTTP 429 ou 400 côté API dégrade donc déjà proprement côté front, sans modification.

`apps/api/test/ai/ai-draft.e2e-spec.ts` teste l'endpoint via supertest sur `AppModule` avec `PrismaService` neutralisé ; il envoie aujourd'hui une `photoUrl` sur `https://pub.example.test/...`, un hôte qui ne correspondra plus au verrou CDN (l'env de test résout `R2_PUBLIC_BASE_URL` sur le défaut `https://cdn.zwibba.example`).

## Recommended Architecture

### 1. Verrou d'origine des photos (anti-SSRF)

Créer `apps/api/src/ai/ai-draft-guardrails.ts` avec une fonction pure `isAllowedDraftPhotoUrl(photoUrl, publicBaseUrl)` : parse la `photoUrl` avec `new URL(...)`, exige le protocole `https:`, et vérifie que l'URL normalisée commence par `publicBaseUrl` normalisé (slash final retiré, comparaison sur l'origine + début de pathname pour interdire `https://cdn.zwibba.example.attacker.com`). Toute URL invalide ou hors CDN est refusée.

`AiController` applique ce verrou avant `generateDraft` : refus en `BadRequestException` avec un message français dans le ton existant (« Cette photo ne provient pas d'un téléversement Zwibba. »). Le contrôleur reçoit le `publicBaseUrl` via un provider de configuration exposé par `AiModule` (factory `loadEnv()`, même pattern que les providers existants du module). Effet de bord vertueux : pour consommer du crédit AI, un attaquant doit désormais réellement téléverser un objet sur R2 d'abord.

### 2. Rate limiting par adresse IP

Dans le même `ai-draft-guardrails.ts`, suivre le pattern de `otp-rate-limit.ts` : constantes `AI_DRAFT_RATE_WINDOW_MS` (15 minutes) et `AI_DRAFT_RATE_MAX_REQUESTS` (5), fonctions pures `pruneDraftAttempts(timestamps, now, windowMs)` et `isDraftRateExceeded(count, max)`, plus `resolveClientIp(headers, socketAddress)` qui prend la **dernière** entrée de `x-forwarded-for` (celle ajoutée par le proxy Railway, non falsifiable par le client) et retombe sur l'adresse socket sinon.

Créer `apps/api/src/ai/ai-draft-limiter.service.ts` : classe `AiDraftLimiterService` avec une `Map` IP → timestamps en mémoire, purgée à chaque vérification (mémoire bornée par la fenêtre). Fournie par `AiModule`, consommée par `AiController` : dépassement → `HttpException` statut 429 avec message français (« Trop de brouillons IA demandés. Réessayez dans quelques minutes. »). `App/services/ai-draft.mjs` convertit déjà tout statut non-`ok` en `manual_fallback` avec ce message — zéro changement front.

### 3. Plafond global journalier de dépense AI

`AiDraftLimiterService` tient aussi un compteur global par jour UTC (clé `YYYY-MM-DD`, remis à zéro au changement de jour). La limite vient d'une nouvelle entrée d'env : `AI_DRAFT_DAILY_LIMIT` (défaut `500`), ajoutée à `ZwibbaEnv` (`ai.draftDailyLimit`) et aux `defaultEnvValues` de `apps/api/src/config/env.ts` avec parsing entier positif (pattern `readPort`). Plafond atteint → le contrôleur retourne directement le contrat `manual_fallback` existant en 200, sans toucher aux providers : les vendeurs continuent en saisie manuelle, la dépense AI est bornée à un maximum connu par jour, et l'UX ne montre jamais d'erreur brutale.

### 4. Câblage du module et ordre des vérifications

`AiModule` fournit `AiDraftLimiterService` (factory avec `loadEnv()` pour `draftDailyLimit`) et le token de config du `publicBaseUrl`. `AiController` vérifie dans l'ordre : présence de `photoUrl` (existant), verrou CDN (400), rate limit IP (429), plafond global (`manual_fallback` 200), puis seulement `AiService.generateDraft`. `AiService` n'est pas modifié.

### 5. Tests

Fonctions pures de `ai-draft-guardrails.ts` couvertes par un nouveau `apps/api/test/ai/ai-draft-guardrails.test.ts` (cas : URL CDN valide, hôte piégé `cdn.zwibba.example.attacker.com`, `http:` refusé, URL interne Railway refusée, parsing `x-forwarded-for`, fenêtre glissante). `AiDraftLimiterService` couvert par `apps/api/test/ai/ai-draft-limiter.service.test.ts` avec horloge injectée (dépassement de fenêtre, reset journalier). `apps/api/test/ai/ai-draft.e2e-spec.ts` mis à jour : les `photoUrl` existantes passent sur `https://cdn.zwibba.example/...`, et deux cas ajoutés — URL hors CDN → 400, sixième appel d'une même IP → 429.
