# Zwibba Social Image Sharing Design

**Date:** 2026-09-20

## Goal

Let a visitor share the branded listing visual to Instagram or TikTok, with an explicit export fallback. Keep the single Partager entry on published listings.

## Problem

The current entry immediately sends a URL to the OS share sheet. The reported Android screen consequently offers Instagram Messages and no TikTok. The branded Open Graph card is not passed as a media file.

## Non-Goals

No account connection, automatic social publication, native SDK, database mutation, new image generation or backfill. Do not restore Partager en story on listing details.

## Existing System

The API exposes shareImageUrl. The detail button currently passes only primary and story images. The controller prepares files with cancellation, capability checks and size/type validation. Success-screen story behavior remains available separately.

## Recommended Architecture

### 1. Visible destination choice

Listing entry opens the Zwibba menu. Instagram/TikTok choices explain the media handoff and expose the prepared image, download and caption. The OS chooses available applications; there is no promise to force a destination. Existing URL sharing remains available.

### 2. Correct media

Pass shareImageUrl from listing detail through app.js into the controller. Prepare that branded card for listing shares. Keep storyImageUrl for the explicit success context. Prepare before the user's sharing click, then share files only, without text/url competing with the image.

### 3. Honest fallback

Export and caption copy are explicit actions. Unsupported native file sharing, errors and cancelled shares never claim publication or trigger another operation. Retain stale-request/abort protection and HTML escaping.

### 4. Validation

Test initial menu behavior, branded file selection, destination choices, synchronous file handoff, copy/download fallback, cancellation and unchanged success story behavior. Run full root tests/build/smoke contracts, Fable5.1 high review and GitHub CI, then verify the released website bundle. Native Instagram/TikTok completion on the user's phone remains a separate acceptance check.

Sources consulted 2026-09-19: MDN Web Share API and Navigator.share; TikTok Android Share Kit documentation (updated2026-08-04). Web Share cannot force an application, and TikTok's native SDK is not a PWA API.
