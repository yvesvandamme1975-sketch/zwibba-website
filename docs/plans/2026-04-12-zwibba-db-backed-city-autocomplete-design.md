# Zwibba DB-Backed City Autocomplete Design

**Date:** 2026-04-12  
**Status:** Approved  
**Owner:** Codex

## Goal

Replace the current hard-coded profile area dropdown with a DB-backed city autocomplete for Congo (`CD`), while letting sellers immediately use a missing city they propose.

## Why This Change

The current `zone` flow is too rigid:

- it is powered by a short static list in the browser and API
- it does not scale beyond one country
- it blocks valid cities that are not in the list

This feature should move the city catalog into the database so Zwibba can:

- support a richer Congo city list now
- allow users to add missing cities without being blocked
- stay structurally ready for future country expansion

## Product Behavior

### Profile Zone UX

In `#profile`, the seller sees a text input instead of a `<select>`.

- Placeholder: `Tapez une ville`
- Typing shows suggestions from the DB-backed Congo city list
- Matching is case-insensitive and accent-insensitive
- Prefix matches rank first
- Containment matches can appear after prefix matches

Examples:

- `L` suggests `Lubumbashi`, `Likasi`
- `Kin` suggests `Kinshasa`
- `kis` suggests `Kisangani`

### Missing City Flow

If no existing city matches the typed value closely enough, the UI shows:

- `Ville absente ? Utiliser "Kasumbalesa"`

When the seller selects that action:

- the city is created immediately in the database
- it is marked as user-provided, not system-seeded
- it becomes the chosen profile city right away
- the seller can save the profile without waiting for moderation or admin approval

### Scope of Stored Value

For this pass, the seller profile continues to store a single string city label in `User.area`.

This is intentional:

- it preserves compatibility with the existing draft/listing flows
- it avoids a wide migration of `Listing.area`, `Draft.area`, and related browser code
- it still unlocks a reusable DB-backed location catalog for future work

So the source of truth becomes:

- city options list: DB
- selected seller city: `User.area`

## Data Model

Add a new reusable DB table for location options.

### Proposed Prisma Model

`LocationOption`

- `id`
- `countryCode` -> `CD`
- `label` -> human city label, e.g. `Lubumbashi`
- `normalizedLabel` -> e.g. `lubumbashi`
- `type` -> `city`
- `status` -> `active`
- `sourceType` -> `system_seed | user_suggested`
- `createdAt`
- `updatedAt`

### Why This Model

This gives us:

- country scoping
- future support for other location types
- a clean distinction between seeded and user-suggested data
- duplicate prevention through normalized matching

## Seeding Strategy

Create a re-runnable seed path for Congo cities.

Initial system-seeded cities should cover the main Congo cities, for example:

- Kinshasa
- Lubumbashi
- Likasi
- Kolwezi
- Goma
- Bukavu
- Kisangani
- Mbuji-Mayi
- Kananga
- Matadi
- Beni
- Butembo
- Bunia
- Tshikapa
- Uvira

The seed must be idempotent:

- rerunning it must not duplicate existing rows
- seeded cities should stay `sourceType = system_seed`

## API Design

Introduce a dedicated locations module instead of burying this inside the profile module.

### Endpoints

`GET /locations/cities?countryCode=CD`

Returns the active Congo city options for autocomplete.

Response shape:

```json
{
  "items": [
    {
      "countryCode": "CD",
      "id": "loc_lubumbashi",
      "label": "Lubumbashi",
      "sourceType": "system_seed",
      "type": "city"
    }
  ]
}
```

`POST /locations/suggestions`

Creates or reuses a missing city immediately.

Request shape:

```json
{
  "countryCode": "CD",
  "label": "Kasumbalesa",
  "type": "city"
}
```

Response shape:

```json
{
  "countryCode": "CD",
  "id": "loc_kasumbalesa",
  "label": "Kasumbalesa",
  "sourceType": "user_suggested",
  "type": "city"
}
```

### Deduplication Rules

Suggestions must be normalized before insert:

- trim whitespace
- collapse internal spaces
- lowercase
- remove accents

If a normalized city already exists for `CD + city`, the API should return that existing row instead of creating a duplicate.

## Browser Architecture

### Data Loading

The browser should stop using the static `areaOptions` list for the profile form.

Instead:

- load cities from the API when the profile route becomes active
- cache them in app state for the session
- use them to power the autocomplete UI

### UI Structure

In `profile-screen.mjs`, replace the zone `<select>` with:

- one text input for search
- one suggestion list below it
- one “missing city” action when no exact match exists

Suggested UI behavior:

- keep the current saved city in the input on render
- highlight the selected suggestion
- selecting a suggestion fills the input with the canonical city label
- the save action still posts a single string area to `/profile`

### Validation

The browser should accept two valid sources for save:

- a DB city selected from suggestions
- a just-created missing city returned by `POST /locations/suggestions`

The browser should not send arbitrary raw text directly to `/profile` in this pass.

## Search Behavior

Autocomplete ranking should be simple and deterministic:

1. exact normalized match
2. prefix normalized match
3. substring normalized match
4. alphabetical tie-break

This keeps the logic explainable and stable on mobile.

## Compatibility

### What Stays the Same

- `User.area` remains the saved profile field
- `Draft.area` continues to inherit from profile
- `Listing.area` remains a string
- publish flow and listing detail do not need to change

### What Changes

- static profile area validation is removed
- profile city validation now checks the DB-backed location catalog
- missing city creation is possible before profile save

## Testing Strategy

### API

- seeded Congo cities are returned from `GET /locations/cities`
- `POST /locations/suggestions` creates a new user-suggested city
- suggesting the same city twice returns the existing row instead of duplicating it
- `POST /profile` accepts seeded and newly suggested cities

### Browser

- typing filters suggestions correctly
- prefix matches appear before weaker matches
- selecting a suggestion sets the chosen city
- missing city flow creates and selects the new city
- profile save sends the chosen city and shows success

## Risks and Mitigations

### Risk: Duplicate city spellings

Mitigation:

- normalize on the server
- dedupe by normalized label + country + type

### Risk: Too much architectural churn

Mitigation:

- keep `User.area` as string in this pass
- add only the city catalog table and supporting API

### Risk: Future multi-country confusion

Mitigation:

- explicitly include `countryCode`
- seed only `CD` in this pass

## Out of Scope

Not part of this pass:

- province/territory hierarchy
- country switcher in the UI
- admin review workflow for suggested cities
- migration of listings/drafts from string area to foreign key references
- map/geocoding integrations

## Recommendation

Implement a dedicated DB-backed Congo city catalog with immediate-use suggestions, while keeping the saved seller zone as a string for compatibility.

This is the smallest design that:

- solves the current UX problem
- avoids blocking users on missing cities
- keeps Zwibba ready for future country expansion

