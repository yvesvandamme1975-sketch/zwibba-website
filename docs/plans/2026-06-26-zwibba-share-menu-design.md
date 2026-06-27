# Zwibba Share Menu Design

**Date:** 2026-06-26

## Goal

Faciliter le partage d une annonce sur toutes les plateformes (Huawei / iOS / Android) via UN seul bouton "Partager" qui ouvre une feuille avec WhatsApp, Facebook, Instagram et Copier le lien.

## Problem

Le partage actuel s appuie sur le Web Share API (`navigator.share` + `canShare({files})`), present sur iOS Safari et Android Chrome recents mais souvent absent des navigateurs Huawei (sans services Google). Le fallback retombe sur "copier le lien". Les handlers WhatsApp / Facebook / download existent deja dans `App/app.js` mais aucun bouton ne les expose. Resultat : sur Huawei, l utilisateur n a pas d acces direct a WhatsApp/Facebook/Instagram.

## Non-Goals

- Pas de SDK natif ni d app store.
- Pas de partage Instagram via "intent" web (inexistant) : Instagram = telechargement de l image story + ouverture d Instagram.
- Pas de changement du template d image story.

## Existing System

`App/app.js` : delegation d evenements sur `appRoot` (data-action), rendu via `renderApp()` pilote par `state`. Handlers existants : `handleWhatsAppShare`, `handleFacebookShare`, `handleListingLinkCopy`, `handleStoryImageDownload`, `handleNativeStoryShare`. Le site sert des balises OG par annonce -> un partage de lien montre l image en apercu partout.

## Recommended Architecture

### 1. Feuille de partage (bottom sheet)

Nouveau `App/components/share-menu.mjs` : `renderShareMenu(menu)` rend une feuille (backdrop + sheet) avec 4 options (WhatsApp, Facebook, Instagram, Copier le lien), chacune portant le contexte annonce (url, slug, titre, storyImageUrl) en data-attributs. Rendu par `renderApp` (appendu apres le shell), pilote par `state.shareMenu`.

### 2. Bouton unique

Les boutons "Partager" de l ecran de succes et du detail d annonce passent en `data-action="open-share-menu"` (avec storyImageUrl). Le handler ouvre la feuille ; chaque option appelle le handler existant puis ferme la feuille. Instagram : `handleInstagramShare` telecharge l image story et ouvre Instagram.

### 3. Robustesse cross-plateforme

WhatsApp/Facebook utilisent des URLs d intent web (`window.open`) qui marchent partout (Huawei inclus) et montrent l apercu OG. Copier le lien et telechargement d image ne dependent d aucune API native.
