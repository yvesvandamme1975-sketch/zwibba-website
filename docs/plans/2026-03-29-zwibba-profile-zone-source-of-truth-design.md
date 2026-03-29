# Zwibba Profile Zone Source-of-Truth Design

> **Scope:** Make seller `zone` profile-owned, remove manual zone choice from the seller review form, and require a saved profile zone before publish.

## Summary

Zwibba currently treats `area` as draft-owned data. The seller chooses it manually in the review form, and the profile screen has no persisted zone at all. This creates the wrong ownership model: the seller profile should define the seller's zone once, and new listings should inherit it automatically.

This change introduces a single seller profile zone that becomes the source of truth for new drafts. The seller can edit the zone in `Profil`, review shows the zone as read-only, and publish blocks cleanly until the profile zone exists. Existing listings keep their own persisted area values.

## Goals

- Add one persisted seller profile zone.
- Make new drafts inherit the profile zone automatically.
- Remove manual zone selection from seller review.
- Block publish with a clear message if the seller has no profile zone yet.
- Preserve existing listing areas for already-published content.

## Non-Goals

- No per-listing zone override in this pass.
- No multi-zone seller support.
- No geo lookup, maps, or location autodetection.
- No migration of old listings to a new zone.

## Product Behavior

### Seller profile

- `Profil` gains a `Ma zone` setting.
- The seller can choose one zone from the existing Zwibba area list.
- Saving the profile updates the seller's default zone for future drafts.

### Seller review and publish

- The seller review form no longer shows a zone dropdown.
- It displays the current profile zone as a read-only field.
- A secondary action links the seller back to `#profile` to change the zone.
- If the seller has no zone configured:
  - review shows a clear missing-state warning
  - publish validation fails with a profile-zone-specific error
  - the seller is sent to `#profile`

### Draft behavior

- A brand-new draft inherits `profile.area` immediately.
- Existing unfinished drafts should also adopt the saved profile zone if they still have no area.
- Drafts that already have an area keep it unless explicitly refreshed by a profile-zone sync path added in this pass.

### Existing listings

- Published listings keep the `area` stored on the listing record.
- Changing the seller's profile zone does not rewrite old listings.

## Data Model

### API / database

- Add `area String @default("")` to `User`.
- Continue storing `area` on `Draft` and `Listing`.
- Treat `User.area` as the default source used when creating or syncing seller drafts.

### Browser app

- Add a persisted profile zone to the authenticated seller profile state.
- Keep `draft.details.area`, but source it from `profile.area` rather than a review-form selector.

## API Surface

Add the smallest profile API needed for the browser app:

- `GET /profile`
  - returns at minimum:
    - `phoneNumber`
    - `area`
- `POST /profile`
  - request:
    - `area`
  - response:
    - updated `phoneNumber`
    - updated `area`

Draft and publish flows should continue to accept `area`, but the browser app should supply it from the saved profile zone rather than from a manual review form control.

## Browser App Changes

### Profile screen

- Add a `Ma zone` card near the verified phone/session block.
- Show:
  - current zone if set
  - a zone selector using the existing area option list
  - a save action
- Saving the zone should:
  - update the live profile state
  - update the current draft if the seller is mid-flow and the draft has no explicit area yet

### Review screen

- Replace the `Zone` dropdown with a read-only summary row.
- If the profile zone exists:
  - show the chosen zone
  - show `Modifier dans le profil`
- If no profile zone exists:
  - show an error-state block
  - do not render a dropdown fallback

### Validation and navigation

- Replace `Sélectionnez une zone manuellement.` with profile-owned copy:
  - `Définissez votre zone dans le profil avant de publier.`
- `decidePublishGate(...)` should keep the review route for validation errors, but the UI should expose a direct path to `#profile`.

## Data Flow

1. Seller opens app with a verified session.
2. Browser loads profile.
3. If `profile.area` exists:
   - new drafts inherit it
   - review shows it read-only
4. If `profile.area` is empty:
   - seller can still start a draft
   - publish stops at review with a zone-from-profile error
   - seller goes to profile, saves zone, returns, and publishes

## Error Handling

- Invalid or empty profile zone on save:
  - reject server-side
  - show inline profile error
- Missing profile zone on publish:
  - validation error in review
  - no silent fallback to draft-local manual zone entry
- Profile fetch failure:
  - keep the seller flow usable
  - show profile as unavailable
  - block publish until zone can be confirmed

## Testing Strategy

### Browser

- profile screen renders and saves `Ma zone`
- new drafts inherit the saved profile zone
- review no longer renders a zone dropdown
- review shows the read-only profile zone
- publish fails with a profile-zone-specific error when zone is missing

### API

- profile get returns the seller area
- profile save persists area on the authenticated user
- draft sync accepts profile-owned area values as before

### Live verification

- set zone in `#profile`
- create a new listing
- review shows the zone without a selector
- publish succeeds
- clear zone or use a user without zone
- review blocks publish and points back to profile

## Risks

- Existing sessions currently load only phone/session token, so profile fetch must become a first-class dependency for seller flows.
- The browser app currently assumes `areaOptions` live only in review; moving ownership to profile touches both seller state and validation.
- Mobile/Flutter parity is not included in this pass and will need a follow-up cleanup if browser/API become the new contract.
