# Zwibba Profile Return And Price Entry Design

> **Scope:** Add a direct `Revenir au brouillon` action after saving the seller zone in `#profile`, and make seller price entry reliable on mobile so listings can be submitted.

## Summary

The profile-owned zone rule is now live, but two seller UX gaps remain:

- after saving the profile zone, the seller has no direct way back to the draft review flow
- the review price field still uses a strict numeric input that is fragile on mobile keyboards and long CDF values

This pass keeps the product behavior small and focused. It adds a direct route back to the draft, changes the price field to a mobile-friendly text input with numeric keyboard hints, and sanitizes price text before validation/submission.

## Goals

- Add a direct `Revenir au brouillon` path from `#profile` when a seller draft exists.
- Make price entry resilient to spaces, punctuation, and mobile keyboard quirks.
- Keep the seller’s final price fully manual.
- Improve clarity with an example placeholder and a formatted CDF helper.

## Non-Goals

- No USD support in this pass.
- No currency conversion.
- No AI price suggestions.
- No API schema change for pricing.

## Product Behavior

### Profile

- When a seller has a draft in progress, the profile zone card shows `Revenir au brouillon`.
- The CTA links directly to `#review`.
- It stays available after a successful profile-zone save, so the seller can immediately continue the listing flow.

### Review price field

- The seller price field becomes:
  - `type="text"`
  - `inputmode="numeric"`
- The field shows a simple example placeholder such as `Ex: 450000`.
- The app shows a helper line under the input with a formatted preview:
  - `450 000 CDF`
- The helper updates from the parsed numeric value, not from raw punctuation or spacing.

### Submission behavior

- The seller can type:
  - `450000`
  - `450 000`
  - `450.000`
  - `450,000`
- The browser normalizes that to digits-only before validation and submit.
- Empty or invalid values still fail validation as before.

## Technical Approach

- Add a small shared browser utility for seller price input parsing/formatting.
- Keep API validation unchanged.
- Update the review screen to render the friendlier input and helper line.
- Update the app event handling to refresh the helper line while typing.
- Keep all changes browser-side.

## Testing Strategy

### Browser tests

- Profile shows `Revenir au brouillon` when a draft exists.
- Review renders a text price input with numeric keyboard hint and placeholder.
- Review renders the formatted CDF helper.
- Price parsing accepts spaced/punctuated numeric strings and returns the expected integer.

### Verification

- local tests for profile, post-flow, and price parsing
- smoke build
- live browser check on `/App/#profile` and `/App/#review`
