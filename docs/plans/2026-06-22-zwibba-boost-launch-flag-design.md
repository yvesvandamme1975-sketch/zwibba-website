# Zwibba Boost Launch Flag Design

**Date:** 2026-06-22

## Goal

Donner la capacite de desactiver l achat de boost au lancement via un flag d environnement, sans rien changer par defaut (le boost reste actif tant que le flag n est pas explicitement mis a false).

## Problem

Le boost (`POST /boost`) debite 15000 CDF d un portefeuille qui n a aucune entree d argent reelle (le wallet est un stub, pas de paiement). Au lancement on veut pouvoir le desactiver proprement cote serveur, mais sans risquer de le couper par accident : un defaut qui desactive sur variable absente couperait le boost en prod au premier deploiement.

## Non-Goals

- Pas de paiement reel ni de top-up wallet.
- Pas (encore) de masquage du bouton boost cote App : quand le flag est false, l endpoint refuse (403) et l App affiche l erreur ; le masquage proactif de l UI est un suivi.
- Pas de changement de comportement par defaut.

## Existing System

`BoostController` (`POST /boost`, garde session) delegue a `BoostService.activateBoost`, qui debite le wallet et cree un `BoostPurchase` en transaction. `apps/api/src/config/env.ts` valide l environnement au boot.

## Recommended Architecture

### 1. Flag d environnement fail-safe

`env.ts` expose `boost.enabled = (ZWIBBA_BOOST_ENABLED ?? 'true').trim() !== 'false'` : active par defaut, desactive uniquement si la variable vaut exactement `false`. Aucun piege production (variable absente => actif = comportement actuel).

### 2. Garde dans BoostService

`BoostService` lit `loadEnv()` et, en tete de `activateBoost`, leve `ForbiddenException('Le boost est temporairement indisponible.')` si `boost.enabled` est false. Aucun debit, aucun BoostPurchase quand desactive.
