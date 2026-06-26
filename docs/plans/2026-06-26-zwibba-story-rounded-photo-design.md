# Zwibba Story Rounded Photo Design

**Date:** 2026-06-26

## Goal

Arrondir les coins de la photo produit dans l image story de partage pour un rendu plus moderne (carte).

## Problem

`apps/api/src/share/compose-story-image.ts` composite la photo (972x972) avec des coins droits sur le fond sombre. Demande utilisateur : coins arrondis.

## Non-Goals

- Pas de changement du lockup "Je vends sur" + logo ni du pied vert.
- Pas de re-bake automatique des annonces existantes (image cuite a la publication).

## Existing System

La photo est resize 972x972 (cover) puis compositee a (PHOTO_TOP, 54). sharp est deja utilise.

## Recommended Architecture

### 1. Masque coins arrondis

Avant compositing, appliquer a la photo un masque SVG rect a coins arrondis (rx = PHOTO_RADIUS = 48) via `composite([{ input: mask, blend: 'dest-in' }])` : la photo est conservee la ou le rect est opaque, transparente ailleurs, laissant apparaitre le fond sombre du canvas aux coins.
