# Zwibba Browser Real Seller Upload Design

**Date:** 2026-03-25

**Goal**

Replace the seller-side demo photo flow in `/Users/pc/zwibba-website-worktrees/browser-live/App` with real browser file selection and mobile camera capture, using the existing live upload, draft sync, and publish stack end to end.

**Scope**

- Remove seller reliance on demo photo presets and generated fallback upload assets.
- Support real first-photo selection from desktop browsers and camera capture on supported mobile browsers.
- Support real guided-photo uploads for each required and optional prompt.
- Upload photos to R2 immediately after selection and persist them through the existing draft API.
- Resume uploaded draft photos after refresh or restart.
- Keep the existing seller review, OTP, publish, and success flow structure intact.
- Keep gallery behavior, multi-file first-photo selection, photo reordering, and admin media tooling out of scope.

**Architecture**

The browser app already has a live media path through `/media/upload-url`, direct `PUT` upload to R2, `/drafts/sync`, and `/moderation/publish`. This pass reuses that path instead of introducing a second upload system. The browser app will create a temporary object URL only for immediate preview, request a signed upload URL for the selected file, upload the file immediately, and then persist the uploaded photo metadata into the existing draft model so the rest of the seller flow can stay unchanged.

**Reuse Boundaries**

- Reuse:
  - `App/services/media-service.mjs`
  - `App/services/live-draft-service.mjs`
  - `App/models/listing-draft.mjs`
  - existing API `/media/upload-url`
  - existing API `/drafts/sync`
  - existing API `/moderation/publish`
  - existing review, OTP, publish, and success screens
- Change:
  - `App/features/post/capture-screen.mjs`
  - `App/features/post/post-flow-controller.mjs`
  - `App/features/post/photo-guidance-screen.mjs`
  - `App/features/post/review-form-screen.mjs`
  - seller event wiring in `App/app.js`
- Remove from seller flow:
  - demo photo preset cards as the primary capture path
  - browser-generated fallback upload images
  - publish-time photo re-upload for photos already marked uploaded

**Upload Flow**

1. Seller enters `#capture`.
2. The capture screen presents a real file entry action using `accept="image/*"` and `capture="environment"`.
3. After file selection:
   - create a temporary object URL for preview
   - create or update the draft locally
   - request a signed upload URL from the API
   - upload the file immediately to R2
   - persist the uploaded photo metadata into the draft
4. Guided prompts use the same mechanism one slot at a time.
5. Review and publish operate only on the already-uploaded draft photo records.

**State Model**

Each seller photo slot should stay inside the current draft shape, but include explicit upload state handling:

- `uploading`
- `uploaded`
- `failed`

Required prompts only count as complete when the slot is `uploaded`. Failed uploads must stay visible and retryable. The app may show a local preview while a file is uploading, but the authoritative media state is the uploaded R2 object referenced in the draft.

**UI Behavior**

- Capture screen:
  - replace demo preset cards with a real first-photo action
  - support both desktop picker and mobile camera capture through the same input control
- Guided photo screen:
  - each `Ajouter` action opens real file selection
  - each slot shows preview, uploading, uploaded, or retry state
- Review:
  - render only real draft photos from the current uploaded draft state
  - do not show demo asset paths
- Success:
  - continue using the persisted draft/listing data; do not regenerate photo content

**Validation**

- The first step may continue only after the first photo upload succeeds.
- Guided required photos count as complete only when upload succeeded.
- Publish must stop if any required photo is still pending or failed.
- Publish must reuse already-uploaded photos instead of uploading them again.

**Error Handling**

- Failed upload:
  - keep the slot visible
  - show retry state and message
  - do not mark the prompt complete
- Refresh or restart:
  - restore uploaded photos from the persisted draft
  - restore pending local-only UI only if it still has a valid preview reference
- Unsupported camera capture:
  - the same input should fall back to the file picker without breaking the flow

**Testing**

- Browser tests:
  - first real file creates a draft
  - guided file upload marks the prompt complete
  - failed upload shows retry state
  - refresh resumes uploaded photos
  - publish does not re-upload already-uploaded photos
- Public beta check:
  - select or capture a real image in `/App`
  - complete required guided uploads
  - pass OTP
  - publish successfully
  - see the uploaded image reflected in seller success and buyer detail
