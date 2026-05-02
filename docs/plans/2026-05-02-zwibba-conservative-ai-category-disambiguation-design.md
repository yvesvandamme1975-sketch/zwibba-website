# Zwibba Conservative AI Category Disambiguation Design

**Date:** 2026-05-02

## Goal

Improve seller-side AI category accuracy by adding a conservative post-processing layer that avoids confidently wrong category choices, especially between visually similar or text-adjacent rubriques.

## Problem

Zwibba already produces a first-photo draft through:

- Gemini as the primary multimodal reasoning source
- normalization in `apps/api/src/ai/ai-normalization.ts`
- optional Google Vision enrichment in `apps/api/src/ai/google-hybrid-draft-fusion.ts`

This works well for many broad products, but some categories are close enough that the model can still over-specialize or confuse neighboring rubriques:

- `services` vs `emploi`
- `beauty` vs `health`
- `music` vs `electronics`
- `construction` vs `home_garden`
- `food` vs `agriculture`
- `education` vs `electronics` or `home_garden`

The product priority is now explicit: **avoid wrong categories first**. That means we prefer a safe generic category over an incorrect specific one.

## Non-Goals

- No buyer-side visual search
- No major rewrite of the Gemini provider contract
- No probabilistic scoring model in this pass
- No always-on aggressive auto-correction
- No attempt to infer price or moderation decisions from this layer

## Existing System

Today the category decision path looks like this:

1. `Gemini` returns `title`, `categoryId`, `condition`, `description`
2. `ai-normalization.ts` validates supported ids and falls back to `electronics` when invalid
3. `google-hybrid-draft-fusion.ts` can refine a small subset of OCR-sensitive categories
4. `AiService` returns a final `ready` draft or `manual_fallback`

This means category choice is still concentrated in the provider output, with only limited business-rule correction afterward.

## Recommended Architecture

### 1. Add a dedicated conservative disambiguation step

Introduce a new pure API-side module, for example:

- `apps/api/src/ai/category-disambiguation.ts`

This module will receive:

- the normalized Gemini draft patch
- Google Vision signals when available

It will return:

- the same category if evidence is weak or ambiguous
- a corrected category only when evidence is explicit and strong

### 2. Keep Gemini as the primary prediction source

Gemini should still propose the first category. The new layer is not a replacement model. It is a business-rule guardrail that says:

- “keep it” when the prediction is plausible and unchallenged
- “correct it” only on strong evidence
- “do not promote” when the signal is fuzzy

### 3. Centralize category-family heuristics

Heuristics should be defined by category family, not scattered across prompt strings and one-off regex checks.

First families to support:

- `services` vs `emploi`
- `beauty` vs `health`
- `music` vs `electronics`
- `construction` vs `home_garden`
- `food` vs `agriculture`
- `education` vs nearby generic categories

Each family should define:

- strong keywords
- weak keywords
- promotion rules
- “never promote on weak evidence” rules

### 4. Keep Google Vision as supporting evidence

Google Vision remains useful for:

- OCR text
- logos
- generic labels
- object hints

But this new layer should treat those as signals, not ground truth.

## Decision Model

The category decision should follow this order:

1. Normalize the Gemini category into Zwibba taxonomy
2. Gather OCR/logo/object/label signals
3. Apply conservative disambiguation rules
4. Return the category only if:
   - the current category remains acceptable
   - or a more specific category is supported by strong evidence

If signals are mixed or weak:

- keep the current category
- or keep the safe generic fallback

The key rule is:

> Never promote to a narrower rubrique on weak evidence.

## First Heuristic Set

### `services` vs `emploi`

Promote to `emploi` only if OCR or labels explicitly indicate recruitment intent, such as:

- `recrutement`
- `offre d'emploi`
- `poste`
- `hiring`
- `urgent hire`

Stay in `services` for:

- cards
- business activity names
- contact details
- service menus
- company signage without recruiting language

### `beauty` vs `health`

Use `beauty` for strong cosmetic/self-care cues:

- maquillage
- parfum
- coiffure
- onglerie
- salon beauté
- rouge à lèvres

Use `health` for explicit health or care-product cues:

- pharmacie
- complément
- tensiomètre
- thermomètre
- soin médical
- bandage

Do not promote either one from a generic bottle or jar alone.

### `music` vs `electronics`

Use `music` for clear musical-instrument or music-production items:

- guitare
- piano
- clavier musical
- batterie
- ampli instrument
- micro studio

Keep `electronics` for:

- speaker
- casque
- écouteurs
- audio accessories

unless the context clearly indicates instrument or studio equipment.

### `construction` vs `home_garden`

Use `construction` for:

- ciment
- béton
- brique
- perceuse
- disqueuse
- chantier
- matériel de maçonnerie

Keep `home_garden` for:

- furniture
- household items
- decor
- storage
- garden/home objects without construction intent

### `food` vs `agriculture`

Use `food` for items ready to sell or consume:

- packaged food
- produce sold as food
- labels for edible products

Use `agriculture` for:

- tools
- seeds
- sprayers
- farming equipment
- harvest context clearly tied to agricultural work

### `education` vs generic categories

Use `education` for:

- books
- cahiers
- school supply sets
- class/course posters
- university packs

Keep generic categories when the educational cue is weak or absent.

## Prompt Changes

The prompt should also be tightened to reduce over-classification. It should explicitly tell Gemini:

- not to use `emploi` without recruiting evidence
- not to use `music` for generic audio electronics
- not to use `beauty` or `health` unless the product nature is clear
- to prefer a safe broader category when unsure

This should complement, not replace, the rule layer.

## Reliability Rules

- strong OCR with consistent labels can justify a correction
- one weak keyword cannot justify a promotion
- conflicting signals should preserve the current safe category
- the disambiguation layer must be deterministic and testable

## Rollout Plan

### Phase 1

- implement the pure disambiguation module
- add tests for the initial category families
- wire it into `AiService`
- log category corrections

### Phase 2

- expand heuristics where logs show repeated confusion
- tune prompt examples and phrasing

### Phase 3

- consider internal confidence scoring only if the conservative rule system proves insufficient

## Testing Strategy

Add tests at three levels:

### Unit tests

- per family, with strong-signal and weak-signal examples
- assert that weak evidence does not promote

### AI service tests

- ensure the final returned category reflects disambiguation rules
- ensure no regression in existing ready/manual fallback behavior

### Prompt tests

- ensure prompt includes new conservative instructions for close categories

## Recommended Outcome

Ship a conservative post-normalization disambiguation layer first.

This gives Zwibba a much better chance of:

- reducing obviously wrong specific categories
- preserving stable seller autofill
- staying explainable and testable

without introducing a heavy scoring system or unpredictable model behavior.
