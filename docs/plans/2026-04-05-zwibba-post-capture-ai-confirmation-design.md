# Zwibba Post-Capture AI Confirmation Design

## Summary

Add a short post-capture confirmation step to the browser seller flow so users on Android, iPhone, and desktop can clearly see that their first photo was uploaded and that AI draft preparation completed before they continue to the editable review form.

## Goals

- Make the first-photo success state obvious on every platform.
- Reassure the seller that the photo is stored and visible.
- Show the AI-generated draft fields once, in read-only mode, before edit.
- Keep the existing upload, AI, and publish pipeline unchanged.

## Product Behavior

### New route

- Add a new browser route: `#capture-result`.
- After the first photo succeeds, route there instead of jumping directly to `#review` or `#guidance`.

### Capture result screen

- Show the uploaded primary photo prominently.
- Show an explicit success state:
  - `Photo téléversée`
  - `Brouillon préparé par IA`
- Show read-only values for:
  - `Titre`
  - `Catégorie`
  - `État`
  - `Description`
- If AI falls back:
  - keep the uploaded photo visible
  - show a manual-completion note instead of partial field output

### Continue action

- If the draft still needs required guided photos, CTA goes to `#guidance`.
- Otherwise CTA goes to `#review`.
- The seller still edits only on the review form.

## UX Boundaries

- No backend changes.
- No second AI run.
- No extra publish step.
- No slowdown beyond one short confirmation screen with a single CTA.

## Technical Direction

- Add a new `renderCaptureResultScreen(...)` browser screen module.
- Update route parsing to recognize `#capture-result`.
- Update seller route rendering and route-key handling in `App/app.js`.
- Change `handleCapture(...)` so first-photo success always lands on `#capture-result`.
- Use existing `draft.photos`, `draft.details`, and `draft.ai` data only.

## Testing

- Route parser recognizes `#capture-result`.
- First-photo flow renders the confirmation screen state correctly.
- Confirmation screen shows uploaded image plus AI fields when AI is ready.
- Confirmation screen shows fallback copy when AI is unavailable.
- CTA goes to `#guidance` only when required guided photos remain, otherwise `#review`.
- Existing seller smoke flow remains green.
