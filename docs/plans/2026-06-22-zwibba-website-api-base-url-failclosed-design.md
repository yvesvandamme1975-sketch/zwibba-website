# Zwibba Website API Base URL Fail-Closed Design

**Date:** 2026-06-22

## Goal

Durcir le service website (`server.mjs`) pour qu'il **refuse de démarrer en production** si `ZWIBBA_API_BASE_URL` n'est pas définie, au lieu de retomber silencieusement sur une URL d'API codée en dur. Extraire la résolution de l'URL dans un module pur testable, sur le modèle de `shared/listing-og.mjs`.

## Problem

`server.mjs` (ligne 12) résout l'URL de l'API ainsi :

```
const apiBaseUrl = process.env.ZWIBBA_API_BASE_URL || 'https://api-production-b1b58.up.railway.app';
```

La variable d'environnement existe déjà, mais le fallback en dur fait que si elle n'est pas posée sur Railway (oubli, renommage du service API, nouvel environnement), le website continue de démarrer en pointant vers une URL d'API potentiellement périmée — sans aucun signal d'erreur. C'est exactement la classe de panne silencieuse que le sprint de durcissement cherche à éliminer. De plus, `apiBaseUrl` est calculée au niveau module et le serveur démarre dès l'import de `server.mjs`, ce qui rend la logique de résolution impossible à tester unitairement en l'état.

Le service de modération `apps/admin` et l'API `apps/api` valident déjà leurs variables d'environnement requises au boot (`apps/api/src/config/env.ts`) ; le service website est le seul des trois à ne pas le faire pour sa dépendance critique vers l'API.

## Non-Goals

- Ne touche pas la validation d'environnement de `apps/api` ni `apps/admin` (déjà couverte, hors Phase 0 code).
- Le `railway.json` introduit (section 5) ne contient **aucun champ de build** (`builder`, `buildCommand`, `dockerfilePath`) : on ne touche pas le pipeline de build qui fonctionne. Uniquement des réglages `deploy` purement additifs.
- Ne touche pas les services `apps/api` et `apps/admin` : leur racine Railway est `apps/api` / `apps/admin`, donc un `railway.json` à la racine du dépôt ne s'applique qu'au service **website**.
- Ne modifie pas le comportement en développement (`NODE_ENV` non-`production`) : le fallback de confort reste pour le dev local.
- Ne change pas la convention de branches : `codex/website-vitrine-backup` reste la trunk, `main` reste la landing.
- Ne réécrit pas le serveur HTTP ni le routage des annonces (`/annonce/<slug>/`) — seule la résolution de l'URL d'API est touchée.

## Existing System

`server.mjs` à la racine est le service website servi par Railway (`package.json` racine : `prestart` = `node scripts/build.mjs`, `start` = `node server.mjs`). Il sert `dist/`, rend dynamiquement les balises OG par annonce, et **proxie** les annonces vers l'API via `fetchListing(slug)` qui appelle `${apiBaseUrl}/listings/${slug}` (server.mjs, fonction `fetchListing`). `apiBaseUrl` est figée à l'import (ligne 12).

Le repo possède déjà le patron exact à suivre : `shared/listing-og.mjs` est un module pur, importé par `server.mjs` (`import { buildListingOgTags } from './shared/listing-og.mjs'`), et testé indépendamment par `tests/listing-og.test.mjs`. Les tests racine tournent via `node --test tests/*.test.mjs` (script `test` du `package.json` racine).

`PORT` et `RAILWAY_PUBLIC_DOMAIN` sont aussi lus depuis l'environnement en haut de `server.mjs` ; eux gardent des défauts légitimes (port de dev, domaine optionnel) et ne sont pas concernés.

## Recommended Architecture

### 1. Module pur `shared/api-base-url.mjs`

Créer `shared/api-base-url.mjs` exportant une fonction `resolveApiBaseUrl(env)` qui prend un objet d'environnement (par défaut `process.env`) et applique la règle :

- Si `env.ZWIBBA_API_BASE_URL` est une chaîne non vide → la retourner (en retirant un éventuel `/` final, comme `server.mjs` normalise déjà ailleurs).
- Sinon, si `env.NODE_ENV === 'production'` → lever une `Error` au message explicite (ex. `ZWIBBA_API_BASE_URL is required in production`).
- Sinon (dev/test) → retourner le défaut de confort `https://api-production-b1b58.up.railway.app`.

Le module ne fait **aucun** effet de bord (pas de lecture directe de `process.env` au niveau module, pas de démarrage de serveur), ce qui le rend testable comme `shared/listing-og.mjs`.

### 2. Câblage dans `server.mjs`

Remplacer la ligne 12 de `server.mjs` par un import de `resolveApiBaseUrl` depuis `./shared/api-base-url.mjs` et un appel `const apiBaseUrl = resolveApiBaseUrl(process.env);`. En production sans la variable, l'import/exécution lève l'erreur **avant** que le serveur n'écoute — fail-closed. En dev, comportement inchangé.

### 3. Test `tests/api-base-url.test.mjs`

Ajouter `tests/api-base-url.test.mjs` (runner `node --test`) couvrant les trois cas : (a) variable posée → renvoie la valeur normalisée ; (b) `NODE_ENV=production` sans variable → lève l'erreur attendue ; (c) `NODE_ENV` non-production sans variable → renvoie le défaut. Le test importe le module pur, sans démarrer `server.mjs`.

### 4. Note de clarification dans la doc de gouvernance

Ajouter dans `CLAUDE.md` (racine, branche trunk) une courte note actant que `main` = landing est **intentionnel**, que la trunk reste `codex/website-vitrine-backup`, et que le `main` *local* peut dériver (snapshot d'app) sans que cela change la convention — pour éviter qu'une future session ré-interprète à tort `main` comme la trunk. Modification purement additive, aucun retrait des règles existantes.

### 5. Config-as-code Railway pour le service website (`railway.json`)

Ajouter un `railway.json` à la racine du dépôt, qui ne s'applique qu'au service **website** (racine Railway = racine du dépôt ; `apps/api` et `apps/admin` ont leur propre racine et ne sont donc pas affectés). Le fichier ne contient **que** des réglages `deploy` purement additifs, jamais de champ de build :

- `deploy.healthcheckPath` = `"/"` — Railway attend une réponse 200 sur `/` (la landing, servie par `server.mjs` depuis `dist/index.html`) avant de basculer le trafic sur le nouveau déploiement. Élimine les fenêtres où un déploiement cassé reçoit du trafic.
- `deploy.healthcheckTimeout` = `300`.
- `deploy.restartPolicyType` = `"ON_FAILURE"` avec `deploy.restartPolicyMaxRetries` = `10` — redémarrage automatique en cas de crash.
- `$schema` = `"https://railway.com/railway.schema.json"`.

On omet délibérément `build.builder`, `build.buildCommand` et `deploy.startCommand` : ces champs override-raient le pipeline de build/start actuellement fonctionnel (le service utilise le builder auto-détecté de Railway + les hooks `prestart`/`start` du `package.json` racine). Railway ne met à jour que les champs présents dans le fichier ; tout le reste continue de venir du tableau de bord. Un test (`tests/railway-config.test.mjs`) valide que le fichier est un JSON correct et porte bien le `healthcheckPath` attendu, et qu'aucun champ de build n'y figure.
