# Zwibba Category Photo Rules Design

## Goal

Align Zwibba seller category and photo requirements with the new beta rules:
- one photo minimum for every annonce
- add separate `emploi` and `services` categories
- suggest a business-card/logo photo for `services`
- suggest a company visual/logo photo for `emploi`
- require five guided photos for `vehicles`: `avant`, `arriere`, `droite`, `gauche`, `interieur`

## Product Rules

### Global minimum

- Every category requires at least one uploaded primary photo.
- No listing can be published without a photo.
- This stays enforced through the existing primary-photo validation path.

### Services

- New category id: `services`
- Seller can publish with one uploaded primary photo.
- Guided photo suggestion:
  - `Carte de visite ou logo`
- This is advisory only, not a blocking requirement.

### Emploi

- New category id: `emploi`
- Seller can publish with one uploaded primary photo.
- Guided photo suggestion:
  - `Logo ou visuel de l’entreprise`
- This is advisory only, not a blocking requirement.

### Vehicles

- Existing category id: `vehicles`
- Seller must provide these required photos before publish:
  - `Avant`
  - `Arrière`
  - `Vue droite`
  - `Vue gauche`
  - `Intérieur`
- Optional supporting views remain acceptable, such as dashboard and mileage, but do not replace the five required photos.

## Scope

### Browser `/App`

- Add `Emploi` and `Services` to the seller category list.
- Update guided-photo prompts and copy.
- Update vehicle prompt labels and required-photo logic.
- Keep the current “one primary photo minimum” publish gate for all categories.

### API / AI

- Accept `emploi` and `services` in the AI taxonomy and normalization layer.
- Allow AI to return those categories when they fit the uploaded image.
- Keep fallback behavior conservative when the model is uncertain.

### Buyer / listings labels

- Ensure listing/category labels can render `Emploi` and `Services` anywhere category labels are surfaced from the API.

## Out of Scope

- New seeded content for `emploi` and `services`
- New admin moderation workflows
- New schema changes
- Changes to price UX

## Risks

- Vehicle guidance is stricter than before, so any test data or seller-flow assumptions that still use `profil` will need to be updated.
- AI category fallback will remain imperfect for some ambiguous business/service images; the browser must still allow manual correction.
