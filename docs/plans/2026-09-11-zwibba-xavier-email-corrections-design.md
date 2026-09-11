# Zwibba Xavier Email Corrections Design

**Date:** 2026-09-11

## Goal
Complete the first real email correction case on Zwibba: responsive seller messaging and understandable native sharing.

## Problem
The owner supplied six screenshots of client feedback: the message button appears inert; social buttons do not open the expected app; the desired destination is the phone share sheet. Private screenshots remain outside Git.

## Non-Goals
No social account login, automatic social publication, client message sending, framework migration or new hosting service.

## Existing System
`App/services/listing-share.mjs` already implements native link/file sharing. `App/components/share-menu.mjs` displays separate network shortcuts. `App/app.js` opens the custom menu first. Listing actions render in `App/features/listings/listing-detail-screen.mjs`. Production trunk is `codex/website-vitrine-backup` at the fetched baseline 6ba7da5.

## Recommended Architecture
### 1. Native sharing first
The primary share action invokes the native link sheet synchronously from the click. Keep the custom menu for unsupported/error cases. A separate story entry prepares the existing image before the second, activation-preserving share click. Remove network shortcuts that imply an integration we do not have. Reuse the same story image across user-selected destinations; the receiving application controls presentation and feed/story placement.
### 2. Seller messaging
Reproduce the reported inert action using isolated fixtures before editing. Preserve anonymous login and prevent duplicate conversation creation. Record the demonstrated cause and scoped correction in the implementation plan before changing messaging code.
### 3. Delivery evidence
Run root tests, build and production contracts plus a browser regression for the changed interactions. Review the exact diff before PR and verify the affected production service after release. The case receipt must distinguish assistant-operated pilot stages from future unattended orchestration.
