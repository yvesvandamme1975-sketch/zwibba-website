# Zwibba Profile Return And Price Entry Implementation

1. Add browser tests for:
   - profile `Revenir au brouillon`
   - review price input type/placeholder/helper
   - tolerant price parsing utility
2. Add a small browser utility for:
   - `normalizePriceDigits(raw)`
   - `parsePriceInput(raw)`
   - `formatPricePreview(raw)`
3. Update the review screen to:
   - use `type="text"`
   - use `inputmode="numeric"`
   - render placeholder example
   - render formatted helper preview
4. Update app event handling to:
   - parse the price via the new utility on submit
   - update the preview helper while typing
5. Update the profile screen to show:
   - `Revenir au brouillon` when a draft exists
6. Run targeted tests:
   - `tests/profile-screen.test.mjs`
   - `tests/post-flow.test.mjs`
   - `tests/price-input.test.mjs`
   - `npm run smoke:app`
7. Deploy website if verification passes.
