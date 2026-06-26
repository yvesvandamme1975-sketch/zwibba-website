# Zwibba Story Brand Lockup Design

**Date:** 2026-06-26

## Goal

Agrandir et bien placer le branding "Je vends sur" + logo Zwibba dans l image story de partage, qui etait minuscule et illisible.

## Problem

`apps/api/src/share/compose-story-image.ts` rendait "Je vends sur" + le logo dans un petit bandeau en haut (texte 56, boite logo 420x80 : le logo, de ratio ~1.414, etait contraint en hauteur et rendu ~113px, illisible), tout en laissant un grand vide noir gaspille entre la photo et le pied vert. Demande utilisateur (capture annotee) : un "Je vends sur + logo" grand et lisible sous la photo.

## Non-Goals

- Pas de re-bake des images story deja generees (cuites a la publication, stockees R2). Seules les nouvelles annonces auront le nouveau rendu.
- Pas de changement du pied vert (titre/zone/prix) ni de la photo.

## Existing System

`composeStoryImage` compose un canvas 1080x1920 : header (Je vends sur + logo), photo 972x972, footer vert. `sharp` rasterise le SVG du logo (`zwibba-logo.svg.ts`, viewBox 841.89x595.28, marque + wordmark, sans tagline).

## Recommended Architecture

### 1. Lockup branding centre sous la photo

Remonter la photo (top 96), supprimer le petit header, et composer un lockup "Je vends sur" + logo dans l espace entre la photo et le footer.

### 2. Logo rogne pour un placement au pixel

Rasteriser le logo a densite 320, `trim()` pour enlever les marges internes du SVG, puis `resize({ width: 560 })`. Mesurer sa hauteur reelle, calculer la hauteur du bloc (label + gap + logo) et centrer le bloc verticalement dans l espace photo->footer ; centrer le logo horizontalement. "Je vends sur" en Manrope 72 vert #9aff8f au-dessus.
