# Zwibba DB-Seeded Feed And Safety Card Design

**Date:** 2026-04-10

## Goal

Make the `/App` buyer feed show real starter listings from the database for underrepresented categories, while keeping those listings distinguishable from user listings for future analytics. At the same time, redesign the listing-detail safety tips so they read as a lightweight warning block, not as part of the classified content itself.

## Recommended Approach

Use a **database-backed starter listing model** instead of mixing static and live feeds:

1. Add a dedicated `sourceType` field on `Listing` with at least:
   - `user`
   - `system_seed`
2. Create a **re-runnable seed script** that inserts or updates starter listings for the target categories when missing.
3. Keep `/listings` as a single source of truth from the database.
4. Refactor the listing-detail safety section into one orange warning card with an `Attention` visual marker and smaller copy.

This gives the buyer feed immediate category coverage without maintaining a second fake feed path, and it preserves a clean future split for stats and reporting.

## User-Facing Behavior

### Buyer feed

`/App/#buy` should continue to use the live API feed only.

The difference is that the feed now contains a small set of **system starter listings** in the database for categories that otherwise look empty:

- `Services`
- `Emplois`
- `Alimentation`
- `Agriculture`
- `Construction`
- `École / Université`
- `Sports et loisirs`

These listings should appear like normal feed cards so the marketplace feels populated across the new category chips.

### Safety tips on listing detail

The current safety block reads too much like part of the announcement body because it reuses generic listing-card styling and sits at the same visual weight as primary content.

Replace it with:

- one dedicated warning card
- orange border/background treatment
- an `Attention` label with icon
- smaller type than title/description
- maximum of two short tips

The goal is to keep safety visible without letting it compete with the actual product or seller content.

## Data Model

Extend `Listing` with:

- `sourceType: String @default("user")`

Allowed initial values:

- `user`
- `system_seed`

No other schema changes are required for this pass.

This field is not yet used to filter feeds or stats, but it makes that possible later:

- exclude seeds from KPI dashboards
- segment marketplace activity between real users and starter inventory
- safely replace or remove starters later

## Seed Strategy

Use a **re-runnable script**, not runtime injection.

The script should:

- run against the real database
- create or update deterministic records for starter listings
- be safe to run multiple times without duplication

Recommended deterministic records:

- one `Draft`
- one primary `DraftPhoto`
- one `Listing`

per starter listing slug.

The script should seed at least:

- `service-plomberie-urgence-7j7`
- `offre-receptionniste-lubumbashi-centre`
- `mangues-et-avocats-frais-du-haut-katanga`
- `pulverisateur-agricole-16l-lubumbashi`
- `lot-ciment-outils-chantier-lubumbashi`
- `pack-fournitures-scolaires-universitaires`
- `velo-fitness-loisir-lubumbashi`

Each seeded listing should:

- use the existing bundled image URLs
- carry `sourceType = system_seed`
- stay `moderationStatus = approved`
- stay `lifecycleStatus = active`

## Feed And API Behavior

No second browse-feed path should be introduced.

`GET /listings` should continue to:

- read from the `Listing` table
- filter to public active listings only
- return summaries normally

Because the starter listings now live in the same database, the buyer app sees them automatically through the existing service.

## UX Rules For New Categories

### Photo guidance

New categories should keep one primary photo as the only publish requirement for now, but the guidance should feel intentional:

- `food`
  - optional:
    - `vue_ensemble`
    - `emballage_etiquette`
- `agriculture`
  - optional:
    - `vue_ensemble`
    - `etat_materiel`
- `construction`
  - optional:
    - `vue_ensemble`
    - `detail_materiel`
- `education`
  - optional:
    - `vue_ensemble`
    - `lot_complet`
- `sports_leisure`
  - optional:
    - `vue_ensemble`
    - `detail_materiel`

### Safety tips

Specialize safety tips by category where helpful:

- `food`
  - verify freshness/expiry
  - prefer local handoff for perishables
- `agriculture`
  - inspect equipment condition before payment
  - confirm compatibility or capacity on site
- `construction`
  - verify quantity and condition before payment
  - inspect tools/materials on site
- `education`
  - inspect the full lot before paying
  - confirm edition or level before purchase
- `sports_leisure`
  - test the equipment if possible
  - inspect wear before paying

Keep all tips short and operational.

## Testing Strategy

### API and DB

- add coverage for the new `sourceType` field
- add coverage for the seed helper or seed script logic:
  - creates missing starters
  - updates existing starters
  - remains idempotent
  - marks listings as `system_seed`

### Feed

- extend `listings.e2e-spec.ts` to verify seeded DB listings appear in the normal feed payload

### Browser UI

- update listing detail tests to verify:
  - one orange warning card
  - `Attention` label
  - no repeated generic listing cards for safety tips

### Guided photo UX

- update post-flow tests to verify the new optional prompt labels for the new categories

## Out Of Scope

- analytics implementation
- moderation UI changes for seeds
- automatic deletion/rotation of starters
- hiding contact actions for seed listings
- multi-photo required rules for the new categories
