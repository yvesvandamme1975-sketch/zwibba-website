# Zwibba Story Regenerate Endpoint Design

**Date:** 2026-06-26

## Goal

Permettre de re-generer l image story d une annonce existante (apres un changement de template) SANS reordonner le flux, pour repasser toutes les annonces deja publiees au nouveau format.

## Problem

L image story est cuite a la publication et stockee sur R2 (cle fixe `listings/<id>/story.png`). Apres le nouveau template (logo agrandi + coins arrondis), les annonces existantes gardent leur ancienne image. Re-baker via `POST /moderation/:id/approve` ecrit storyImageUrl -> bump `updatedAt`, or le flux (`listBrowseFeed`) trie par `updatedAt desc` -> un re-bake de masse reordonnerait tout le flux. Il faut re-generer sans changer l ordre.

## Non-Goals

- Pas de changement du template ni du flux de publication normal.
- Pas de re-bake automatique massif cote serveur (déclenché par un script ops admin, throttle).

## Existing System

`ModerationService.approve` met a jour moderationStatus + publishedAt puis bake (fire-and-forget). `StoryImageService.generateAndStoreForListing` fetch la photo, compose, upload R2, `listing.update({ storyImageUrl })` (bump updatedAt). Le controleur valide `x-zwibba-admin-secret` via `requireAdminSecret`.

## Recommended Architecture

### 1. Endpoint admin regenerate-story

`POST /moderation/:listingId/regenerate-story` (garde admin secret) -> `ModerationService.regenerateStory(listingId)` : lit updatedAt, AWAIT `generateAndStoreForListing` (skip propre si pas de photo), puis restaure updatedAt via `$executeRaw UPDATE "Listing" SET "updatedAt" = <original>`. Le storyImageUrl est mis a jour, l ordre du flux est preserve.

### 2. Re-bake de masse (script ops)

Un script parcourt `/listings` (annonces approuvees) et appelle regenerate-story pour chacune, en petits lots throttle, pour ne pas surcharger sharp/R2.
