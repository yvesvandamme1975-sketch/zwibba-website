# Zwibba Market Foundation (Multi-Pays CD/BE) Design

**Date:** 2026-08-04

## Goal

Poser la fondation multi-pays de Zwibba : la RDC (`CD`) et la Belgique (`BE`) deviennent deux marchés distincts — comptes, annonces, flux de navigation, devises et files de modération sont scopés par pays, et les numéros `+32` peuvent s'inscrire via l'OTP WhatsApp existant.

## Problem

Tout le système suppose la RDC. `apps/api/src/auth/auth.service.ts` rejette tout numéro qui ne commence pas par `+243` (aucun Belge ne peut s'inscrire). `User`, `Draft` et `Listing` n'ont aucun champ pays ; `listBrowseFeed()` ne filtre rien — un acheteur belge verrait les annonces de Lubumbashi. `ListingPriceCurrency` est limité à `'CDF' | 'USD'` (pas d'EUR) et `formatListingPrice()` traite tout non-USD comme du CDF. La file de modération est globale. Le picker de villes (`LocationOption`) est déjà scopé par `countryCode` mais tous les appelants codent `'CD'` en dur (`profile.service.ts:133`, `App/app.js:860` et `:1689`), et seules 15 villes congolaises sont seedées.

## Non-Goals

- Pas de géo-détection ni de bannière de suggestion (`cf-ipcountry`) — paire P2.
- Pas de boutons de contact WhatsApp (`wa.me` vendeur, numéro support par pays) — paire P3.
- Pas d'i18n ni de néerlandais — paire P4 ; l'App reste 100 % française pour la Belgique v1.
- Pas de pages vitrine `/be/` ni hreflang — paire P5.
- Pas de tarification boost/portefeuille en EUR (`amountCdf` reste tel quel, boost désactivable par flag) — paire dédiée ultérieure.
- Pas de libphonenumber : une résolution par préfixe (`+243`/`+32`) suffit pour deux marchés (YAGNI).
- Pas de sélecteur de pays dans l'UI de l'App : le pays est dérivé du numéro de session côté App, du numéro de téléphone côté API.

## Existing System

L'OTP WhatsApp Cloud (PR #34) est déjà en place : `OtpService` + `WhatsappOtpSender` (`META_WHATSAPP_*`), provider global `OTP_PROVIDER=demo|meta` — un seul numéro expéditeur Meta sert les deux pays (décision validée). `LocationOption` (`countryCode`, `@@unique([countryCode, type, normalizedLabel])`) est le seul modèle déjà multi-pays ; `locations.service.ts` accepte `countryCode` en paramètre. `resolveSubmittedListingPrice()` (`apps/api/src/common/price-validation.ts`) valide les prix et lance des `BadRequestException`. Le publish (`moderation.service.ts:191`) copie le Draft vers le Listing via `transaction.listing.upsert`. Les tests API utilisent `node:test` + fakes Prisma via `apps/api/scripts/run-tests.mjs` ; les tests App vivent dans `tests/*.test.mjs`. `apps/api/.env.example` est périmé (il documente encore Twilio, supprimé par PR #34).

## Recommended Architecture

### 1. Résolution du pays par préfixe téléphonique

Nouveau module `apps/api/src/auth/phone-country.ts` : `MarketCountryCode = 'BE' | 'CD'`, `resolvePhoneCountry(phone)` (préfixe `+32` → `BE`, `+243` → `CD`, sinon `null`) et `normalizeMarketCountryCode(value)` (retombe sur `'CD'`). C'est la source de vérité unique du pays d'un utilisateur — miroir minimal côté App dans `App/utils/phone-country.mjs` pour les appels villes.

### 2. Dimension pays dans le schéma

Migration Prisma : colonne `countryCode String @default("CD")` sur `User`, `Draft` et `Listing` (+ index sur `Listing.countryCode`). Le défaut `'CD'` backfille tout l'existant sans script. `verifyOtp` écrit le pays sur l'upsert User ; `syncDraft` le dérive de `ownerPhoneNumber` ; `publish` le copie du Draft vers le Listing et vérifie que la devise est autorisée pour ce marché.

### 3. Devises par marché

`ListingPriceCurrency` devient `'CDF' | 'USD' | 'EUR'` (suffixe d'affichage `€`), et `listingCurrenciesForCountry()` fixe la règle : `CD` → CDF/USD, `BE` → EUR uniquement (euros entiers, cohérent avec le stockage `Int` existant).

### 4. Flux et modération scopés

`GET /listings?countryCode=BE` filtre le feed (défaut `'CD'` — les clients existants ne changent pas de comportement). `GET /moderation/queue?countryCode=BE` filtre via la relation `listing.countryCode` ; l'admin affiche deux files entièrement séparées (onglets RDC / Belgique, décision validée). Le picker de villes reçoit 15 villes belges seedées (`countryCode: 'BE'`) et `profile.service.ts` valide la zone dans le pays dérivé du numéro de session au lieu de `'CD'` en dur.
