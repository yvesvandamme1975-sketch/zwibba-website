# Zwibba WhatsApp Contact (P3) Design

**Date:** 2026-08-06

## Goal

Faire de WhatsApp un canal de contact de premier ordre : un bouton « WhatsApp » sur le détail d'annonce ouvre une conversation avec le vendeur (son propre numéro, message prérempli), et un numéro de support officiel par marché (variables d'environnement) est exposé dans l'App et sur la page contact de la vitrine.

## Problem

Le détail d'annonce (`App/features/listings/listing-detail-screen.mjs`, `renderContactAction`) propose « Envoyer un message » (chat interne) et « Appeler » (`tel:`), mais pas WhatsApp — le canal dominant des deux marchés. `detail.contactPhoneNumber` (numéro E.164 du vendeur, masqué au propriétaire) est déjà exposé par l'API : tout est en place sauf le lien. Côté support, aucun numéro officiel n'existe nulle part (ni App, ni vitrine) ; les numéros Meta Business ne sont pas encore provisionnés, il faut donc une configuration par environnement qui masque proprement le lien tant que la valeur est absente.

## Non-Goals

- Pas d'OTP : l'envoi WhatsApp des codes existe déjà (PR #34), un seul expéditeur pour les deux pays (décision validée).
- Pas d'API WhatsApp Business pour le contact acheteur→vendeur : `wa.me/<numéro du vendeur>` suffit, aucune infrastructure Meta requise.
- Pas de widget de chat support intégré — un lien click-to-chat uniquement.
- Pas de retrait du bouton « Appeler » ni du chat interne : WhatsApp s'ajoute, il ne remplace pas.

## Existing System

`renderContactAction(detail, kind)` rend les actions de contact par `case` (`'message'`, `'call'`) ; `detail.contactPhoneNumber` vient de `getListingDetail` (`apps/api/src/listings/listings.service.ts:301`, vide pour le propriétaire). Le partage WhatsApp d'annonces existe déjà (`handleWhatsAppShare` dans `App/app.js`) mais construit des URL de partage, pas de conversation directe. `scripts/build.mjs` injecte déjà de la configuration build-time dans l'App via `window.ZWIBBA_API_BASE_URL` (env `ZWIBBA_API_BASE_URL`) — le pattern à réutiliser pour les numéros de support. Le pays de navigation (P2) est résolu par `resolveBrowseCountry()` dans `App/app.js`. La page contact vitrine est rendue par `renderContactPage` dans `scripts/build.mjs`.

## Recommended Architecture

### 1. Helper wa.me partagé

Nouveau `App/utils/whatsapp-link.mjs` : `buildWhatsAppChatLink(phoneNumber, text)` — normalise le numéro E.164 en chiffres (`+243 99…` → `24399…`), retourne `https://wa.me/<digits>?text=<encodé>` ou `null` si le numéro est vide/invalide. Testé isolément, réutilisé par le détail d'annonce et les liens support.

### 2. Bouton WhatsApp vendeur sur le détail d'annonce

Nouveau `case 'whatsapp'` dans `renderContactAction` : lien `wa.me` vers `detail.contactPhoneNumber` avec message prérempli « Bonjour, votre annonce « {titre} » sur Zwibba m'intéresse. », `target="_blank" rel="noreferrer"`, placé avant « Appeler ». Masqué (comme « Appeler ») quand `contactPhoneNumber` est vide.

### 3. Numéros de support par marché, configurés par env

Deux variables : `ZWIBBA_SUPPORT_WHATSAPP_CD` et `ZWIBBA_SUPPORT_WHATSAPP_BE` (E.164, vides par défaut → liens masqués). `scripts/build.mjs` les lit au build et (a) les injecte dans la page App via `window.ZWIBBA_SUPPORT_WHATSAPP = {CD: "...", BE: "..."}` (même mécanisme que `ZWIBBA_API_BASE_URL`), (b) rend sur la page contact vitrine un bloc « WhatsApp » avec le(s) lien(s) click-to-chat configuré(s). Dans l'App, l'écran profil affiche « Support WhatsApp » pour le numéro du pays de navigation courant (`resolveBrowseCountry()`), masqué si non configuré.
