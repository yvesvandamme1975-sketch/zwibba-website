# Zwibba Category Expansion And Fashion Sizing Design

**Date:** 2026-05-01  
**Status:** Approved

## Goal

Extend Zwibba's marketplace taxonomy with new user-facing categories, rename the visible construction label to `Bricolage / Construction`, and add structured `Mode` attributes so sellers can capture `Type d’article` and `Taille` with category-aware size lists. When AI vision has enough evidence from an image or label, it may prefill those fashion attributes without taking control away from the seller.

## Decisions

### Category taxonomy

The technical ids remain stable where possible:

- `construction` stays `construction`, but its displayed label becomes `Bricolage / Construction`
- New top-level category ids:
  - `music`
  - `health`
  - `beauty`

These categories must be added everywhere Zwibba currently understands categories:

- seller category picker
- buyer category chips and listing labels
- public site category catalog
- API category labels
- AI taxonomy and normalization

### Fashion attributes

`Mode` gains two structured attributes:

- `itemType`
- `size`

These attributes are only shown and validated when `categoryId === "fashion"`.

### Structured storage

Fashion-specific data will be stored in `attributesJson` on both `Draft` and `Listing`, rather than dedicated columns such as `fashionSize` or `fashionItemType`.

Initial structure:

```json
{
  "fashion": {
    "itemType": "shoes",
    "size": "39"
  }
}
```

This keeps the schema extensible for future category-specific attributes without forcing more one-off columns into `Draft` and `Listing`.

### Fashion item types

Supported initial item types:

- `shoes` -> `Chaussures`
- `pants` -> `Pantalon`
- `tops` -> `T-shirt / Chemise`
- `dress_skirt` -> `Robe / Jupe`
- `jacket_sweater` -> `Veste / Pull`

### Size lists

The `Taille` field is a predefined list that depends on the chosen `Type d’article`.

- `Chaussures`: `36`, `37`, `38`, `39`, `40`, `41`, `42`, `43`, `44`, `45`, `46`
- `Pantalon`: `36`, `38`, `40`, `42`, `44`, `46`, `48`, `50`
- `T-shirt / Chemise`, `Robe / Jupe`, `Veste / Pull`: `XS`, `S`, `M`, `L`, `XL`, `XXL`

If the seller changes `Type d’article`, any incompatible `Taille` value is cleared.

## User experience

### Seller flow

On the review screen:

1. the seller chooses a category
2. if the category is `Mode`, the UI reveals `Type d’article`
3. once `Type d’article` is chosen, `Taille` becomes available
4. both values are saved into the draft and restored during later edits

Outside `Mode`, neither field is shown.

### Listing detail

Published listings in `Mode` show a compact `Détails` block, for example:

- `Type d’article : Chaussures`
- `Taille : 39`

These attributes are not shown in buyer feed cards for this pass.

## AI behavior

The seller image draft pipeline may prefill `fashion.itemType` and `fashion.size`, but only for `Mode` and only when the signal is strong enough.

Signal sources:

- Gemini for article understanding
- Google Cloud Vision OCR for labels, box text, or visible size tags

Rules:

- both fields are optional in the AI response
- neither field is required for AI success
- AI must not partially prefill a contradictory pair
- if only one of the two is credible, Zwibba prefers to leave both empty rather than prefill something misleading

This keeps the experience helpful without making sellers distrust the form.

## Data flow

### Browser app

The draft model gains `attributesJson` support and a small set of fashion helpers:

- available item type options
- size options by item type
- validation helpers
- display label helpers

The review form reads from and writes to `draft.details.attributesJson`.

### API

Draft sync and publish accept `attributesJson` and persist it on `Draft` and `Listing`.

Listing detail and seller listing edit payloads return `attributesJson` so editing remains lossless.

### Backward compatibility

Existing listings and drafts without `attributesJson` remain valid.

- old records default to `null` / empty attributes
- only `Mode` listings created or edited after this change will usually populate these fields

## Validation rules

### Required for `fashion`

When `categoryId === "fashion"`:

- `itemType` is required
- `size` is required
- `size` must belong to the allowed list for the selected `itemType`

### Ignored for other categories

When `categoryId !== "fashion"`:

- any fashion attribute payload is stripped or ignored
- seller validation does not block on those fields

## Testing strategy

### Browser tests

- seller categories include `Musique`, `Santé`, `Beauté`
- `construction` displays as `Bricolage / Construction`
- `Type d’article` and `Taille` appear only for `Mode`
- `Taille` options change by item type
- changing item type clears incompatible size
- listing detail renders the `Détails` block for fashion listings

### API tests

- supported AI categories accept `music`, `health`, `beauty`
- listing labels return the updated and new labels
- draft sync and listing detail round-trip `attributesJson`

### AI tests

- fashion AI output may include `itemType` and `size`
- non-fashion output never depends on them
- uncertain or mismatched fashion signals do not produce half-filled attributes

## Out of scope

- buyer filters by size or item type
- category-specific size systems by brand
- separate top-level category for shoes
- automatic AI filling for health, beauty, or music beyond category selection
- new seeded listings for the newly added categories
