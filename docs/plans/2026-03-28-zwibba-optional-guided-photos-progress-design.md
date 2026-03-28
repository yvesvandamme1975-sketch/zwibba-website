# Zwibba Optional Guided Photos and Upload Progress Design

## Summary

Update the browser seller flow so a listing can be published with one uploaded primary photo, while guided photos remain available as recommended quality improvements. At the same time, make the upload flow feel alive with a staged progress UI that reflects compression, upload, and AI analysis.

## Goals

- Allow seller publish with one uploaded primary photo.
- Keep guided photo slots visible and actionable.
- Make the guided photo UI clearly interactive on mobile and desktop.
- Replace the current vague loading state with stable staged progress.

## Product Behavior

### Publish rule

- The seller can publish once the primary photo is uploaded and the normal metadata fields are complete.
- Guided photos no longer block publish.
- Guided photos remain available as recommended additions for trust and moderation.

### Guidance screen

- Every guided prompt remains visible.
- Required/recommended terminology is softened for beta:
  - primary photo is the only blocking media requirement
  - guided prompts are marked as recommended improvements
- Each prompt card gets a clear upload action:
  - `Ajouter cette photo`
  - `Remplacer` when a photo already exists
  - `Réessayer` after failure

### Upload feedback

- The seller sees staged progress, not a fake percentage:
  - first photo: `Compression` -> `Téléversement` -> `Analyse IA`
  - guided photos: `Compression` -> `Téléversement` -> `Terminé`
- Progress is shown inline in the capture/guidance surfaces so the user understands the app is working.

## UX Boundaries

- No backend schema change is required.
- No multi-photo AI analysis is added.
- No percentage upload bars are added in this pass.
- Moderation can still use guided photos when provided, but the seller is not blocked by their absence.

## Technical Direction

- Update seller validation in the browser flow so guided prompt absence does not produce a publish blocker.
- Keep the current guided upload mechanics, but make the trigger affordance visibly actionable.
- Add a lightweight staged upload state in browser app state and render it from the capture and guidance screens.
- Preserve current upload queue behavior.

## Testing

- Seller can publish with one uploaded primary photo only.
- Guidance screen still exposes upload actions for every prompt.
- Missing guided prompts no longer block publish.
- Staged progress renders during first-photo and guided-photo uploads.
- Existing review and publish flow remain green.
