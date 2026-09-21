# Zwibba Contact Clarity Design
**Date:** 2026-09-21
## Goal
Apply the user-approved Impeccable audit: preserve Zwibba identity, improve discovery and seller contact for Belgium and DRC equally.
## Problem
Country context can be lost, failed feeds resemble empty inventories, category selection is not announced, and contact follows reviews. Marketing delays real listings and obscures web availability.
## Non-Goals
No API, database, native Flutter, payment or authentication-policy changes. No invented testimonials. No unsolicited communications.
## Existing System
Vanilla ESM PWA and generated localized site on trunk 24717b7. Shared CSS tokens, existing controllers and static renderers remain authoritative.
## Recommended Architecture
### 1. Resilient browse
Explicit market links, recoverable error rendering, existing controller retry, accessible toggle states.
### 2. Contact and navigation
Put contact and safety before review and media on buyer detail; retain owner controls. Keep wallet accessible from profile while simplifying primary navigation.
### 3. Discovery and copy
Compact real-market landing with listings before explanatory sections, concise catalogue, collapsible secondary filters and reset. Explicit browser availability in all existing locales. Hide unsourced testimonials without deleting their source records.
### 4. Validation and delivery
Focused behavioral regressions, full root suite and production contracts, one desktop/mobile visual pass then one confirmation if needed. PR to trunk, CI/review, scoped website delivery and live asset/runtime verification. Preserve prior release metadata.
