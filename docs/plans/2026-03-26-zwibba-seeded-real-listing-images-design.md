# Zwibba Seeded Real Listing Images Design

> **Scope:** Replace seeded placeholder listing visuals with curated bundled real photos across `/App` and the static marketing listing pages.

## Summary

Zwibba already supports real uploaded images for live seller-created listings. The remaining placeholder feel comes from seeded and static listing content still using generated SVG artwork or category fallback previews.

This change replaces those placeholder visuals with one curated bundled real image per seeded listing, sourced from Pexels and committed into the repo. The new images must work consistently in both the browser beta at `/App` and the static site listing pages under `/annonce/...`, while preserving the current priority for real user-generated uploads.

## Asset Architecture

- Add one bundled real image per seeded listing to the repository.
- Keep real seller-uploaded images as the first-class source of truth for user-created listings.
- Create one shared manifest that maps each seeded listing slug to:
  - bundled image path
  - alt text
  - optional internal photo credit metadata
- Use the same manifest for:
  - `/App` buyer home and listing detail
  - marketing browse and detail pages
  - any remaining seeded fallback surfaces such as seeded seller listing cards
- Keep the fallback order strict:
  1. live `primaryImageUrl` from the API for user-created listings
  2. bundled seeded listing image for known static listings
  3. existing placeholder/fallback artwork only when neither exists

## Content And Rendering

- Extend the seeded listing records in `/Users/pc/zwibba-website-worktrees/browser-live/src/site/content.mjs` so each static listing has a stable image reference and alt text.
- Replace the generated SVG-only listing asset path in `/Users/pc/zwibba-website-worktrees/browser-live/scripts/build.mjs` with a shared resolver that can point to bundled raster images for seeded listings.
- Keep the current listing-page markup and layout intact; only swap the media source and supporting metadata.
- Update `/App` seeded image fallback logic so seeded browse and detail screens use the bundled listing image instead of generic category art when the listing is part of the static catalog.
- Do not duplicate image selection logic inside each screen. Put the mapping in one shared place and reuse it from the static site build and `/App`.

## Sourcing, Testing, And Rollout

- Source all bundled seeded listing images from Pexels only.
- Store them locally in the repo under a stable listing asset directory and let Railway serve them with the existing build output.
- Keep this pass to one image per seeded listing. No galleries.
- Add a short internal credits file documenting which Pexels asset maps to which listing.

## Testing

- Static build emits the bundled listing images into `dist/assets/listings/`.
- `/annonces/` cards render real `<img>` tags using the bundled listing images.
- `/annonce/.../` pages render the bundled local image instead of the generated SVG placeholder.
- `/App` buyer home and listing detail render the same seeded image correctly.
- No broken image requests occur on the public Railway URL for the seeded listings covered by the manifest.

## Non-Goals

- No gallery support.
- No admin asset tooling.
- No redesign of listing layouts.
- No changes to real seller-uploaded listing images except preserving their priority over seeded assets.
