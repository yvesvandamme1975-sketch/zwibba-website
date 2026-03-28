# Zwibba Draft Discard Design

## Goal

Add a real `Abandonner mon brouillon` flow in `/App` so sellers can remove a draft and its uploaded photos instead of only resuming it.

## Product Behavior

- Show `Abandonner mon brouillon` only when a seller draft exists.
- Ask for confirmation before destructive deletion.
- Delete:
  - local draft state
  - persisted API draft
  - uploaded draft photo objects in R2
- Do not allow a published draft to be deleted through this path.

## Technical Shape

- Browser:
  - add discard CTA in seller home card and capture resume
  - cancel queued uploads before reset
  - call authenticated draft delete when a remote draft exists
  - route back to `#sell` after success
- API:
  - add `DELETE /drafts/:draftId`
  - enforce seller ownership
  - best-effort delete R2 objects
  - hard fail if the draft already has a listing

## Safety

- Keep published listings protected from draft deletion.
- Keep R2 cleanup best-effort and log failures instead of failing the whole delete when an object is already missing.
