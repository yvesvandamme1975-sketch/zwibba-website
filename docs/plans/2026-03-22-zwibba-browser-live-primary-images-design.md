# Zwibba Browser Live Primary Images Design

**Date:** 2026-03-22

**Goal**

Add real pictures to the live `/Users/pc/zwibba-website-worktrees/browser-live/App` experience by surfacing the first uploaded listing image everywhere it matters now: buyer home, buyer detail, seller review, and seller success.

**Scope**

- Keep the current live browser beta structure and seller flow intact.
- Use the first uploaded `DraftPhoto.publicUrl` as the primary picture for approved listings.
- Render that primary picture in buyer feed cards and the in-app buyer listing detail screen.
- Render the first available draft photo in seller review and seller success.
- Keep the existing fallback visual blocks when no image exists.
- Keep galleries, thumbnails, reordering, and lightbox behavior out of scope for this pass.

**Architecture**

The API already stores uploaded draft photos in Postgres, so this pass does not need a new storage flow. The listings service will derive a `primaryImageUrl` from the first uploaded photo on the linked draft and include it in summary and detail responses. The browser app will render that one URL consistently across buyer and seller surfaces while preserving the current green Zwibba shell and fallback layout when no image is available.

**Data Contract**

- `GET /listings`
  - return `primaryImageUrl` on each item when an approved listing has at least one uploaded photo
- `GET /listings/:slug`
  - return `primaryImageUrl` on the detail payload
- Browser draft-driven seller screens
  - read the first draft photo from the existing draft model, preferring the uploaded `publicUrl` when present and falling back to the draft preview URL

**UI Behavior**

- Buyer home cards
  - render a real image block above the copy when `primaryImageUrl` exists
  - otherwise keep the current dark media placeholder block
- Buyer detail inside `/App`
  - render a single hero image under the title and meta summary
  - keep seller info, safety tips, and contact actions below
- Seller review
  - render the first draft photo as the main preview
  - keep the current draft photo metadata list below it
- Seller success
  - render the first draft photo in the success summary so the published result feels tied to a real listing

**Styling**

- Stay inside the current green, white, and dark-grey system.
- Use rounded image corners, subtle border treatment, and cropped cover presentation.
- Do not introduce carousel controls or gallery navigation in this pass.

**Error Handling**

- Listings with no uploaded photo must still render correctly.
- Broken or missing image URLs must degrade gracefully to the existing placeholder block.
- Seller review and success must still render when the draft only has a local preview URL and no uploaded `publicUrl` yet.

**Testing**

- API tests:
  - summary payload includes `primaryImageUrl`
  - detail payload includes `primaryImageUrl`
  - listings without photos still return successfully
- Browser tests:
  - buyer cards render `<img>` when an image exists
  - buyer detail renders a hero image
  - seller review renders the first draft image
  - seller success renders the first draft image
- Smoke:
  - `/App/#home` still loads publicly
  - buyer detail still opens inside `/App`
  - live cards and detail show pictures when the listing has one
