# Zwibba Geo Country Suggestion (P2) Design

**Date:** 2026-08-06

## Goal

Détecter le pays du visiteur via Cloudflare (`cf-ipcountry`) et lui **suggérer** — jamais imposer — le marché Zwibba correspondant : une bannière discrète propose aux visiteurs anonymes en Belgique de basculer le flux sur le marché belge, avec un choix mémorisé.

## Problem

Depuis P1 (`market-foundation`, PR #39), l'API et l'App savent servir deux marchés (`CD`/`BE`), mais un visiteur anonyme voit toujours le flux congolais : `loadBuyerFeed` (`App/app.js`) ne résout le pays que depuis le téléphone de session, avec repli `'CD'`. Un Belge non connecté n'a aucun moyen de découvrir le marché belge. Depuis la bascule DNS (2026-08-06), zwibba.com est derrière le proxy Cloudflare : chaque requête arrive sur `server.mjs` avec l'en-tête `cf-ipcountry`, mais rien ne le lit.

## Non-Goals

- **Aucune redirection géographique** (30x) — une redirection par IP casserait l'indexation Google (les crawlers viennent d'IP américaines) et le cas diaspora (un Congolais à Bruxelles veut souvent le marché de Lubumbashi). Bannière de suggestion uniquement.
- Pas de pages vitrine `/be/` ni hreflang — paire P5.
- Pas de néerlandais — paire P4 ; la bannière est en français.
- Pas de bannière sur les pages vitrine (`src/site/`) — l'App seulement, là où le flux d'annonces existe ; la vitrine suivra en P5.
- Pas de géolocalisation côté client (API tierce) : `cf-ipcountry` est la seule source.
- Pas de consentement cookie requis : `zwibba_geo` et la préférence locale sont strictement fonctionnels (pas de traçage) — conforme RGPD sans bandeau de consentement.

## Existing System

`server.mjs` est un serveur `node:http` nu qui sert `dist/` ; il ne lit aucun en-tête de requête et n'émet jamais de `Set-Cookie`. Les helpers partagés serveur/build vivent dans `shared/` (`api-base-url.mjs`, `listing-og.mjs`) avec leurs tests dans `tests/`. Côté App, les services à stockage injecté suivent le pattern de `App/services/auth-service.mjs` (adapter `storage`, clé `zwibba_app_*`), et `App/app.js` route les clics par délégation `data-action`. Depuis P1 : `App/utils/phone-country.mjs` (`resolvePhoneCountry`, repli `'CD'`), `loadBuyerFeed({ countryCode })` unique point d'entrée du flux, `listBrowseFeed` de `App/services/listings-service.mjs` accepte `countryCode`, et le formulaire de prix est scopé par marché.

## Recommended Architecture

### 1. Cookie géo posé par le serveur

Nouveau `shared/geo-country.mjs` : `resolveGeoCountry(headers)` (retourne le `cf-ipcountry` si `/^[A-Z]{2}$/`, sinon `null`) et `buildGeoCookie(countryCode)` (chaîne `zwibba_geo=BE; Path=/; Max-Age=86400; SameSite=Lax` — volontairement PAS `HttpOnly`, l'App doit le lire). `server.mjs` ajoute ce `Set-Cookie` à chaque réponse HTML quand l'en-tête est présent. Aucune lecture de cookie côté serveur, aucun changement des réponses non-HTML.

### 2. Préférence de pays côté App

Nouveau `App/services/country-preference.mjs` (pattern storage injecté, clé `zwibba_app_country`) : `getStoredCountry()`/`setStoredCountry(code)` (valeurs `'BE' | 'CD'` via `normalizeMarketCountryCode`-like du `phone-country.mjs` App), plus `readGeoCountry(cookieString)` qui extrait `zwibba_geo` de `document.cookie`. Priorité de résolution du pays de navigation dans `App/app.js` : **session téléphonique > préférence stockée > `'CD'`**. `loadBuyerFeed` utilise cette résolution unique.

### 3. Bannière de suggestion

Nouveau `App/components/country-banner.mjs` : `renderCountrySuggestionBanner()` rend une bannière fixe discrète (« Vous êtes en Belgique — voir les annonces Zwibba Belgique ? ») avec deux actions déléguées : `data-action="accept-country-suggestion"` (stocke `BE`, recharge le flux) et `data-action="dismiss-country-suggestion"` (stocke `CD`, ferme). Condition d'affichage, évaluée dans `renderApp` : pas de session, pas de préférence stockée, `zwibba_geo === 'BE'`. Le choix étant persisté dans les deux cas, la bannière n'apparaît qu'une fois par appareil.

### 4. Sélecteur de marché dans l'écran Acheter

Pour que le choix reste réversible sans bannière, l'écran de navigation acheteur affiche un petit sélecteur « Marché : RDC | Belgique » (`data-action="set-browse-country"`, `data-country`) qui appelle `setStoredCountry` puis recharge le flux. Pour un utilisateur connecté, le pays de session prime et le sélecteur est masqué.
