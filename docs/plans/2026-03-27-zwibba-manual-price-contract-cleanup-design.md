# Zwibba Manual Price Contract Cleanup Design

## Summary

The seller chooses the final price manually. The browser beta should not surface, depend on, or retain AI-derived price suggestions anywhere in the `/App` seller flow. AI remains useful for title, category, condition, and description assistance only.

## Scope

- Remove AI price suggestion fields from the browser-facing draft contract.
- Remove AI price suggestion fields from the API draft-patch response used by the browser beta.
- Keep `Prix final (CDF)` as the only seller pricing control.
- Ignore legacy AI price fields if they appear in older local drafts or stale responses.

## Design

### Browser app

- `draft.details` keeps only seller-owned pricing data: `priceCdf`.
- AI draft mapping drops any `price_range_cdf`, `suggestedPriceMinCdf`, or `suggestedPriceMaxCdf` values.
- Applying an AI draft patch must never write price suggestion fields into the draft.
- Review and publish screens continue to validate only the manual final price.

### API

- The AI draft endpoint continues returning a structured draft patch, but without AI price suggestion fields.
- This keeps the browser/API contract aligned with the product decision that sellers own pricing.

### Compatibility

- Existing local drafts that still contain legacy AI price fields should be sanitized when loaded so the browser contract remains clean.
- No schema migration is needed because this cleanup is contract-level and UI-level only.

## Testing

- Browser AI draft tests should prove price-range fields are ignored and omitted from the mapped patch.
- Seller post-flow tests should prove AI capture flow does not persist suggested price fields into the draft.
- API AI draft tests should prove the endpoint no longer returns `suggestedPriceMinCdf` or `suggestedPriceMaxCdf`.
