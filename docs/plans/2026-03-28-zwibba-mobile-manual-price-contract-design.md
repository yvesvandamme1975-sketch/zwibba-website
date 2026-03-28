# Zwibba Mobile Manual Price Contract Design

## Summary

The Flutter/mobile side should match the live browser/API behavior: the seller chooses the final price manually, and AI does not carry or suggest any price range. The mobile draft contract should no longer expose `suggestedPriceMinCdf` or `suggestedPriceMaxCdf`.

## Scope

- Remove AI price suggestion fields from the Flutter `ListingDraft` model.
- Remove AI price suggestion mapping from the mobile AI draft API service.
- Ignore legacy saved draft JSON keys for AI price suggestions during deserialization.
- Update only the Flutter tests that still depend on those fields.

## Design

### Mobile model

- `ListingDraft` keeps `priceCdf` as the only price field.
- `fromJson` ignores legacy `suggestedPriceMinCdf` and `suggestedPriceMaxCdf` keys instead of preserving them.
- `copyWith` and `toJson` stop carrying those fields.

### Mobile AI service

- `HttpAiDraftApiService.prepareDraft(...)` continues to map AI title/category/condition/description.
- It no longer reads or writes AI price suggestion fields.

### Compatibility

- Old locally cached mobile draft JSON can still contain AI price suggestion keys.
- Parsing that JSON should not fail, and the parsed runtime object should drop those keys cleanly.

## Testing

- Update the AI draft service test to assert that no AI price fields survive the mapping.
- Add a regression test for parsing legacy draft JSON with AI price keys.
- Update widget tests so their fake draft builders stop using AI price fields.
