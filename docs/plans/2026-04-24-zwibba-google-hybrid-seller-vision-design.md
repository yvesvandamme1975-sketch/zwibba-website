# Zwibba Google Hybrid Seller Vision Design

**Date:** 2026-04-24

## Goal

Improve seller-side first-photo autofill quality by combining Google's multimodal and classic vision capabilities without depending on a non-existent public Google Lens API.

## Problem

Zwibba already uses a server-side vision draft pipeline that returns a normalized seller draft:

- `title`
- `categoryId`
- `condition`
- `description`

Today, the primary value comes from Gemini-style multimodal reasoning. That works well for broad object understanding, but some categories benefit from more structured visual extraction:

- OCR on business cards, posters, packaging, and school materials
- logo detection for branded services, products, and enterprises
- generic labels that can reinforce weak visual cues

We want a "Google Lens-like" result for sellers, but Google Lens itself is not available as a public API. The right production path is a hybrid:

- Gemini for high-level multimodal reasoning
- Google Cloud Vision for structured visual signals
- Zwibba API for business-rule fusion and normalization

## Non-Goals

- No buyer-facing visual search in this pass
- No direct browser calls to Google APIs
- No replacement of Zwibba taxonomy with raw Google labels
- No automatic price suggestion
- No Cloud Vision-only fallback that fabricates a seller draft without Gemini

## Existing System

The current `browser-live` API already has:

- `AiService` that returns `ready` or `manual_fallback`
- provider abstraction in `apps/api/src/ai/vision-draft-provider.ts`
- live Gemini provider in `apps/api/src/ai/gemini-vision-draft-provider.ts`
- optional Anthropic/Mistral fallback chain in `apps/api/src/ai/ai.module.ts`
- normalization and completeness rules in:
  - `apps/api/src/ai/ai-normalization.ts`
  - `apps/api/src/ai/ai-taxonomy.ts`

This is a strong base. We do not need a rewrite. We need an enrichment layer.

## Recommended Architecture

### 1. Keep Gemini as the primary draft generator

Gemini remains responsible for producing the draft patch candidate:

- `title`
- `categoryId`
- `condition`
- `description`

That preserves the current product contract and avoids destabilizing seller UX.

### 2. Add a Cloud Vision enrichment provider

Add a dedicated Google Cloud Vision adapter that extracts structured signals from the same uploaded image:

- OCR text
- logos
- labels
- optional localized objects if the response is useful in practice

This provider should not emit a seller draft directly. It should emit an intermediate signal object.

Example shape:

```ts
type GoogleVisionSignals = {
  labels: string[];
  logos: string[];
  ocrText: string;
  objects: string[];
};
```

### 3. Add a server-side fusion step inside Zwibba

The API should combine:

- Gemini draft candidate
- Google Vision signals
- Zwibba taxonomy rules

Fusion rules:

- `title`
  - Gemini first
  - can be refined if OCR/logo reveals a strong brand/model cue
- `categoryId`
  - Gemini first
  - Vision can reinforce or correct only with explicit, high-signal evidence
- `description`
  - Gemini first
  - Vision OCR can enrich product or service specifics
- `condition`
  - Gemini only unless future evidence supports otherwise

### 4. Keep strict normalization and completion gates

After fusion, Zwibba must continue to:

- normalize to supported category ids only
- reject empty or incomplete drafts
- return `manual_fallback` if the result is not trustworthy

The seller must still receive exactly one final outcome:

- `ready`
- or `manual_fallback`

## Detailed Pipeline

1. Seller uploads first photo to R2
2. Browser calls Zwibba API as today
3. API launches in parallel:
   - Gemini draft generation
   - Google Cloud Vision extraction
4. API receives:
   - `geminiDraft`
   - `googleVisionSignals`
5. API runs fusion and normalization
6. API returns:
   - normalized draft patch with `ready`
   - or `manual_fallback`

## Category Strategy

The hybrid value is strongest where OCR and logos matter:

- `services`
- `emploi`
- `education`
- `construction`
- `food`

Lower-value categories for Cloud Vision enrichment:

- `fashion`
- `home_garden`
- `electronics`

Special caution:

- `vehicles`
  - OCR/logo may help with model or brand hints
  - but should not override obvious visual reasoning aggressively

## Reliability Rules

### Source priority

- Gemini remains the primary decision-maker
- Cloud Vision is supporting evidence
- Zwibba business rules arbitrate conflicts

### Conflict handling

If Gemini and Cloud Vision disagree:

- keep Gemini if Vision evidence is weak or generic
- use Vision only when the signal is explicit and useful
- fallback to manual if the result becomes ambiguous

### Failure handling

- if Cloud Vision fails:
  - continue with Gemini-only behavior
- if Gemini fails:
  - do not synthesize a fake draft from Cloud Vision alone
  - return `manual_fallback`

This keeps the current seller contract safe.

## API and Config Changes

Add Google Cloud Vision config to env:

- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_CLOUD_VISION_API_KEY` or service account auth path, depending on deployment choice
- feature flag such as `AI_GOOGLE_VISION_ENRICHMENT_ENABLED`

Recommended production behavior:

- feature-flagged rollout
- default off until logs and tests are in place

## Security and Operations

- Google APIs stay server-side only
- no browser exposure of Google credentials
- short provider timeouts
- structured logs around:
  - Gemini success/failure
  - Vision success/failure
  - fusion overrides
  - manual fallback reasons

Important operational requirement:

- never let Cloud Vision enrichment delay publish UX excessively
- if enrichment is slow, Gemini-only completion should still keep the path usable

## Rollout Plan

### Phase 1

- add Cloud Vision provider
- collect signals
- log them
- do not influence final draft yet, or influence only behind a flag

### Phase 2

- enable fusion for OCR-heavy categories:
  - `services`
  - `emploi`
  - `education`
  - `construction`
  - `food`

### Phase 3

- measure correction rates and fallback reduction
- expand influence only where quality clearly improves

## Metrics to Watch

- `ready` vs `manual_fallback` rate
- seller edit rate after AI autofill
- category-specific correction rate
- OCR-enriched categories vs non-enriched categories
- provider latency
- provider failure rates

## Recommendation

Do not chase "Google Lens as an API." Build a production-safe Zwibba hybrid:

- Gemini = primary seller draft engine
- Cloud Vision = OCR/logo/label enrichment
- Zwibba = taxonomy and trust layer

That is the closest useful equivalent to a Lens-quality seller experience while keeping the current system stable.
