# Zwibba Seller Listing Lifecycle Design

**Date:** 2026-03-30

## Goal

Add seller-controlled marketplace lifecycle actions that feel familiar to Facebook Marketplace while preserving auditability and future stats:

- pause a listing
- mark a listing as sold
- soft-delete a listing with a 30-day restore window
- restore a deleted listing to its previous state
- relist a sold listing

This is a seller-management feature for published listings, not a replacement for the existing draft-discard flow.

## Recommended Approach

Use a **two-layer lifecycle model**:

1. A **current snapshot** stored on `Listing` for fast reads and browse filtering.
2. An **append-only lifecycle event log** for analytics, audit, and future reporting.

This avoids hard-deleting published listings while still letting the UI behave like a user-facing delete/archive action.

## User-Facing Behavior

### Seller-owned listing surfaces

When the current verified session belongs to the listing owner:

- buyer CTAs (`Envoyer un message`, `Appeler`) are replaced by an owner action card
- the owner action card exposes:
  - `Modifier`
  - `Mettre en pause`
  - `Marquer comme vendu`
  - `Supprimer l’annonce`
- if the listing is sold:
  - show `Remettre en vente`
- if the listing is deleted by the seller and still within 30 days:
  - show `Restaurer`

### Seller profile

`Profil > Mes annonces` should expose separate seller-management segments:

- `Actives`
- `En pause`
- `Vendues`
- `Archivées`

Archived listings show:

- deletion reason
- deletion date
- restore deadline
- `Restaurer` CTA when still eligible

Sold listings show:

- sold channel:
  - `Vendu sur Zwibba`
  - `Vendu ailleurs`
- `Remettre en vente`

### Buyer/public behavior

Only listings that are both:

- `moderationStatus = approved`
- `lifecycleStatus = active`

remain visible in browse and detail.

Paused, sold, and seller-deleted listings disappear from buyer browse immediately.

Existing chat threads remain readable, but the thread/listing state should show:

- `Annonce en pause`
- `Annonce vendue`
- `Annonce supprimée par le vendeur`

New contact should no longer be possible on non-active listings.

## Data Model

### Listing snapshot fields

Extend `Listing` with seller lifecycle snapshot fields:

- `lifecycleStatus: String`  
  Allowed values for v1:
  - `active`
  - `paused`
  - `sold`
  - `deleted_by_seller`
- `lifecycleChangedAt: DateTime?`
- `previousLifecycleStatusBeforeDelete: String?`
- `deletedBySellerAt: DateTime?`
- `deletedReason: String?`
- `soldAt: DateTime?`
- `soldChannel: String?`
- `pausedAt: DateTime?`
- `restoredAt: DateTime?`

`restoreUntil` should be derived at read time as:

- `deletedBySellerAt + 30 days`

No separate column is required for v1.

### Lifecycle event table

Add `ListingLifecycleEvent` as an append-only event log:

- `id`
- `listingId`
- `actorPhoneNumber`
- `action`
  - `paused`
  - `marked_sold`
  - `deleted_by_seller`
  - `restored`
  - `relisted`
- `previousStatus`
- `nextStatus`
- `reasonCode`
- `reasonLabel`
- `metadataJson`
- `createdAt`

This is the key piece that makes future stats reliable without reverse-engineering history from mutable listing fields.

## API Design

### Seller lifecycle endpoint

Recommended endpoint:

- `POST /listings/:listingId/lifecycle`

Authenticated seller-only action endpoint.

Request shape:

```json
{
  "action": "delete",
  "reasonCode": "republish_later"
}
```

Supported `action` values for v1:

- `pause`
- `mark_sold`
- `delete`
- `restore`
- `relist`

Additional rules:

- `mark_sold` requires `reasonCode`
  - `sold_on_zwibba`
  - `sold_elsewhere`
- `delete` requires `reasonCode`
  - `not_available`
  - `duplicate_or_error`
  - `republish_later`
  - `other`
- `restore` allowed only when:
  - current `lifecycleStatus = deleted_by_seller`
  - `deletedBySellerAt` is within 30 days
- `relist` allowed only when:
  - current `lifecycleStatus = sold`

Response shape should return the updated lifecycle summary used by both profile and seller-owned detail:

```json
{
  "id": "listing_123",
  "lifecycleStatus": "deleted_by_seller",
  "lifecycleStatusLabel": "Archivée",
  "deletedReason": "Je republierai plus tard",
  "restoreUntil": "2026-04-29T09:00:00.000Z",
  "moderationStatus": "approved"
}
```

### Existing listing endpoints

`GET /listings`

- filter to `approved + active` only

`GET /listings/:slug`

- still public-only for approved + active
- seller-owned lifecycle management should use the seller list payload or a seller-specific detail payload

`GET /listings/mine`

- must include lifecycle metadata:
  - `lifecycleStatus`
  - `lifecycleStatusLabel`
  - `deletedReason`
  - `soldChannel`
  - `restoreUntil`
  - `canRestore`
  - `canRelist`
  - `canPause`
  - `canMarkSold`
  - `canDelete`

## Browser App Design

### Profile

Profile becomes the primary management hub:

- segmented filter for lifecycle buckets
- seller card actions aligned to current lifecycle
- archived listings are visible only to the owner

### In-app listing detail

When the listing belongs to the logged-in seller:

- replace buyer CTA block with seller management card
- show lifecycle badge
- expose relevant actions for the current status

### Confirmation UX

`Supprimer l’annonce`

- destructive confirm modal
- reason required
- copy should explain:
  - listing leaves public browse immediately
  - chats remain
  - restore available for 30 days

`Marquer comme vendu`

- confirm modal
- required reason:
  - sold on Zwibba
  - sold elsewhere

`Restaurer`

- no reason required
- restores to `previousLifecycleStatusBeforeDelete`

`Remettre en vente`

- transitions from `sold` to `active`

## Stats and Analytics

This feature should explicitly support future stats.

Metrics unlocked by the event log:

- sold rate
- sold on Zwibba vs sold elsewhere
- time from publish to sell
- time from publish to delete
- deletion reasons by category
- restore rate
- relist rate after sold
- boost effectiveness by outcome

Event history should be retained even if the listing is not public anymore.

## Scope Boundaries

### In scope

- published listing lifecycle actions
- seller-owned listing management UI
- soft delete with 30-day restore
- sold reason capture
- relist from sold
- lifecycle stats/event logging

### Out of scope

- permanent seller self-service hard delete
- admin retention purge UI
- chat notification redesign
- draft lifecycle changes
- pricing or boost redesign

## Edge Cases

- Seller should be able to delete a paused listing.
- Seller should not lose chat history when deleting or selling a listing.
- Public deep links to sold/deleted/paused listings should resolve as unavailable.
- `restore` returns to the stored previous lifecycle status, not always `active`.
- `blocked_needs_fix` and `pending_manual_review` remain moderation states; seller lifecycle is a separate axis.

## Testing Strategy

### API

- lifecycle action authorization
- valid/invalid state transitions
- public browse exclusion for non-active lifecycle states
- restore window enforcement
- event log creation per lifecycle change

### Browser app

- seller-owned detail shows owner actions instead of buyer CTAs
- profile segments render lifecycle buckets correctly
- delete/sold modals require reasons
- archived listings show restore countdown
- relist returns sold listings to active UI state

### Live beta

- seller marks listing sold
- seller deletes listing
- listing disappears from browse
- seller restores within 30 days
- seller relists sold listing
- chats remain readable across all transitions
