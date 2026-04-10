# Zwibba Multi-Currency Listing Prices Design

> **Scope:** Allow each classified listing to be priced either in `CDF` or `US$`, while keeping wallet, boosts, and internal balance flows in `CDF` only.

## Summary

Zwibba currently stores and renders listing prices as `priceCdf` only. That works for many small listings, but it creates poor seller UX for higher-priced items because values become unnecessarily long.

This pass adds **per-listing currency choice**:

- sellers choose `CDF` or `US$` before entering a price
- the price field stays disabled until a currency is selected
- the chosen currency is stored on the draft and the final listing
- the same seller can publish one listing in `CDF` and another in `US$`

The wallet, boost purchases, and internal account balances remain fully in `CDF`.

## Goals

- Let each listing store a price in either `CDF` or `US$`.
- Make currency selection explicit before price entry.
- Keep price input mobile-friendly and easy to read.
- Render the correct currency consistently across seller and buyer surfaces.
- Preserve all existing CDF listings by migrating them safely.

## Non-Goals

- No FX conversion between `CDF` and `US$`.
- No exchange-rate service.
- No USD cents in this pass.
- No wallet multi-currency support.
- No changes to boost or wallet transaction currencies.

## Product Behavior

### Seller review form

- The seller first chooses a currency:
  - `CDF`
  - `US$`
- Before the currency is chosen:
  - the price field is disabled
  - the UI makes it clear that currency must be selected first
- After the currency is chosen:
  - the price field becomes active
  - the placeholder and helper preview match the selected currency

Examples:

- `CDF`
  - placeholder: `Ex: 450000`
  - helper: `450 000 CDF`
- `US$`
  - placeholder: `Ex: 350`
  - helper: `350 US$`

### Seller behavior across multiple listings

Currency is **not** a profile setting and **not** a global seller preference.

It belongs to each draft/listing individually. That means:

- listing A can be in `CDF`
- listing B can be in `US$`
- editing or publishing one listing does not affect the currency of another

### Buyer-facing rendering

All buyer-facing and seller-facing listing views must render the stored currency:

- buyer feed
- listing detail
- seller success screen
- seller profile listing cards
- publish gate / review summary

### Existing listings

All existing listings and drafts migrate to:

- `priceAmount = existing priceCdf`
- `priceCurrency = "CDF"`

So no existing data changes meaning.

## Data Model

Replace listing/draft announcement pricing from a single `priceCdf` field to:

- `priceAmount: Int`
- `priceCurrency: String`

Allowed initial currency values:

- `CDF`
- `USD`

The browser label remains `US$`, but the technical persisted value should be stable and machine-friendly. `USD` is the recommended stored code.

## Technical Approach

### Database

Add the new fields to:

- `Draft`
- `Listing`

Then migrate existing data:

- copy `priceCdf` into `priceAmount`
- set `priceCurrency = "CDF"`

After the migration is complete and app/API code is switched over, remove `priceCdf`.

### Browser app

Update the seller review form so currency drives price entry:

- add a currency selector before the price field
- disable the price field until currency is selected
- render currency-aware helper text and formatted preview
- parse integer input for both currencies

Replace announcement price formatting with a shared general formatter:

- `formatListingPrice({ amount, currency })`

This formatter should be used only for listing prices. Wallet formatting should remain CDF-specific.

### API

Update draft sync, moderation publish, browse feed, seller listing queries, and listing detail payloads to use:

- `priceAmount`
- `priceCurrency`

Server validation should require:

- a positive integer amount
- a supported currency

No conversion logic is needed.

## Validation Rules

### CDF

- integer only
- positive
- keep the current `Int`-safe upper bound logic

### USD

- integer only
- positive
- also fits in the same integer type

Because USD values will be numerically smaller in practice, this already solves the long-number problem for higher-priced listings without extra schema complexity.

## UI Copy

Recommended labels:

- currency selector label: `Devise`
- options:
  - `CDF`
  - `US$`
- price label:
  - `Prix final`
- helper before selection:
  - `Choisissez d’abord une devise.`

This keeps the UX simple and avoids duplicating the currency in the field label itself.

## Testing Strategy

### Browser

- price field disabled before currency selection
- CDF helper/preview renders correctly
- USD helper/preview renders correctly
- same seller can handle different listings with different currencies
- success/profile/detail surfaces render the chosen currency correctly

### API

- draft sync accepts `CDF`
- draft sync accepts `USD`
- publish accepts both currencies
- listing feed/detail return amount + currency correctly

### Migration

- old `priceCdf` data migrates to `priceAmount + CDF`
- no previously published listing loses its price meaning

## Risks And Mitigations

- **Risk:** incomplete refactor leaves some screens still using `priceCdf`
  - **Mitigation:** centralize formatting and update tests for all key listing surfaces
- **Risk:** wallet UI accidentally uses the new listing formatter
  - **Mitigation:** keep wallet formatting explicitly separate and unchanged
- **Risk:** browser cached bundles show mixed old/new pricing behavior briefly
  - **Mitigation:** deploy API and website together and verify both live

