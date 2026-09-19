# Zwibba Share Visual Brand Design

**Date:** 2026-09-19

## Goal
Answer Xavier's four emails of 18 September (Gmail 1a0b4e4eeab58ab5, 1a0b4f179c20f1bc, 1a0b4f6469a79f49, 1a0b5116d893dd8c): remove the "Partager en story" entry from every published listing, and make the visual that Instagram, WhatsApp and Facebook display when a listing is shared carry the "Je vends sur Zwibba" lockup shown in his example.

## Problem
"Partager" performs a native link share (`navigator.share` with title, text, url). The three receiving applications render a link card from the `og:image` of `/annonce/<slug>/`. In production that image is the raw primary photo for listings approved before 7 September (`shareImageUrl` is null, e.g. `sandwich-poulet-tomate-oignon`), and even where `share.png` exists its copy reads "Découvrez cette annonce sur Zwibba" with a small logo, not the requested lockup. The story button was added by PR #66 (`2d219a1`) and Xavier wants it gone.

## Non-Goals
No sharing of image files through the share sheet, no change to the post-publication success screen, no removal of `story.png` generation, no new hosting, no automatic client email, no redesign of the share controller.

## Existing System
`App/features/listings/listing-detail-screen.mjs` `buildShareButton` clones the share button as `storyButton` when `detail.storyImageUrl` exists. `App/components/share-menu.mjs` keeps an "En post / En story" segmented control and story-only options as the fallback when native sharing is unavailable. `apps/api/src/share/compose-story-image.ts` exports `composeStoryImage` (1080x1920, lockup "Je vends sur" + logo) and `composeLinkImage` (1200x630). `apps/api/src/share/story-image.service.ts` writes `listings/<id>/story.png` and `listings/<id>/share.png` to R2 at moderation approval and stores both URLs on the listing. `shared/listing-og.mjs` emits `og:image` from `shareImageUrl`, else the primary photo. `apps/api/src/moderation/moderation.service.ts` exposes `regenerateStory(listingId)` which preserves `updatedAt`. Production trunk is `codex/website-vitrine-backup` at `67e46c0`.

## Recommended Architecture
### 1. Story access removed from the listing menu
Delete `storyButton`; delete the mode toggle and story-only options from the share sheet so the fallback sheet offers link sharing only. The controller keeps its story code paths and tests untouched; the success screen is not modified.
### 2. Branded link visual, versioned
`composeLinkImage` renders a 1200x630 JPEG: the photo is fitted without deformation inside the left area on a dark ground, the right area carries the "Je vends sur" text and the Zwibba logo at the size of the story lockup, then title, zone and price. The file stays under 300 KB so WhatsApp renders the large card; the lockup sits in the centre band so Instagram and WhatsApp centre crops keep it. The object key becomes `listings/<id>/share-v2.jpg` because Facebook and WhatsApp cache previews per URL; `story.png` keeps its key. `shared/listing-og.mjs` adds `og:image:type` for JPEG.
### 3. Bounded backfill with evidence
`apps/api/scripts/backfill-share-images.ts` lists approved listings whose `shareImageUrl` is null or not `share-v2`, in dry-run by default, with `--limit`; `--apply` calls `regenerateStory` per listing and records before/after URLs. Nothing is written to production before the owner validates the preview and the dry-run report.
