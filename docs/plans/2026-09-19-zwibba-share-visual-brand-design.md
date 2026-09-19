# Zwibba Share Visual Brand Design

**Date:** 2026-09-19

## Goal
Answer Xavier's four emails of 18 September (Gmail 1a0b4e4eeab58ab5, 1a0b4f179c20f1bc, 1a0b4f6469a79f49, 1a0b5116d893dd8c): remove the "Partager en story" entry from every published listing, and make the visual that Instagram, WhatsApp and Facebook display when a listing is shared carry the "Je vends sur Zwibba" lockup shown in his example.

## Problem
"Partager" performs a native link share (`navigator.share` with title, text, url). The three receiving applications render a link card from the `og:image` of `/annonce/<slug>/`. In production that image is the raw primary photo for listings approved before 7 September (`shareImageUrl` is null, e.g. `sandwich-poulet-tomate-oignon`), and even where `share.png` exists its copy reads "Découvrez cette annonce sur Zwibba" with a small logo, not the requested lockup. The story button was added by PR #66 (`2d219a1`) and Xavier wants it gone.

## Non-Goals
No sharing of image files through the share sheet, no functional change to the post-publication success screen (it only declares its context), no removal of `story.png` generation, no listing lifecycle change, no new hosting, no automatic client email, no redesign of the share controller.

## Existing System
`App/features/listings/listing-detail-screen.mjs` `buildShareButton` clones the share button as `storyButton` when `detail.storyImageUrl` exists. `App/components/share-menu.mjs` keeps an "En post / En story" segmented control and story-only options as the fallback when native sharing is unavailable. `apps/api/src/share/compose-story-image.ts` exports `composeStoryImage` (1080x1920, lockup "Je vends sur" + logo) and `composeLinkImage` (1200x630). `apps/api/src/share/story-image.service.ts` writes `listings/<id>/story.png` and `listings/<id>/share.png` to R2 at moderation approval and stores both URLs on the listing. `shared/listing-og.mjs` emits `og:image` from `shareImageUrl`, else the primary photo. `apps/api/src/moderation/moderation.service.ts` exposes `regenerateStory(listingId)` which preserves `updatedAt`. Production trunk is `codex/website-vitrine-backup` at `67e46c0`.

## Recommended Architecture
### 1. Story access removed from the listing menu, kept on the success screen
Delete `storyButton`. The share sheet is link-only by default; the post-publication success screen is the one caller that keeps the story mode, through an explicit `data-share-context="success"` that the controller turns into `storyEnabled`. Without that opt-in the mode toggle, the story-only options and `setMode('story')` are inert. The success screen behaviour is covered by non-regression tests, not assumed.
### 2. Branded link visual, versioned and content-addressed
`composeLinkImage` renders a 1200x630 JPEG: a blurred, darkened full-bleed copy of the photo as backdrop, the photo itself fitted (`inside`, oriented from EXIF, never stretched or cropped) inside the central 630x630 band, and the "Je vends sur" + Zwibba logo lockup centred below it, so the Instagram and WhatsApp centre-square crops keep both. Title, zone, price and `zwibba.com` live in the left panel. Quality steps down until the file is under 300 KB (WhatsApp limit) and the composer refuses to return a larger file. The object key is `listings/<id>/share-v2-<sha256 prefix>.jpg`: Facebook and WhatsApp cache per URL, and a content-addressed key means no referenced object is ever overwritten by a concurrent generation. `story.png` keeps its key. `shared/listing-og.mjs` declares `og:image:type`.
### 3. Bounded backfill with write-ahead manifest and conditional rollback
`StoryImageService.generateLinkImageForListing` regenerates only the link preview of a listing that is publicly visible today (approved, lifecycle active, no `deletedBySellerAt`), never `story.png`, and writes the row with a compare-and-set on `updatedAt` (preserved), the previous `shareImageUrl` and the visibility fields. `apps/api/scripts/backfill-share-images.ts` selects the same population minus listings already on `share-v2`, dry-run by default, `--limit` (default 25, max 200), `--apply --confirm-apply` sequential. The manifest (planned ids with previous URLs, then one entry per result) is persisted before the first write and after every result; `--rollback manifest.json` restores a previous URL only where the database still points at what the backfill wrote. Sold, paused or deleted listings are never touched nor reactivated. Nothing is written to production before the owner validates the preview and the dry-run report.
