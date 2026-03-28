# Zwibba Atomic First-Photo AI Patch Design

## Summary

Zwibba should extract seller draft details from the **first uploaded photo** in one coherent AI result. The seller should not see category and description filled while title stays empty, and the browser should not rely on partial AI patches or repeated autofill attempts to finish the draft.

The corrected behavior is:

1. upload the first real photo
2. call the AI draft endpoint once
3. receive one complete draft patch with `title`, `categoryId`, `condition`, and `description`
4. apply that patch once
5. never auto-overwrite those fields again unless the seller abandons and restarts the draft

## Scope

- Keep AI analysis limited to the first uploaded photo
- Keep price fully manual
- Require the AI patch to be complete enough to populate:
  - `title`
  - `categoryId`
  - `condition`
  - `description`
- Use a single browser application point for that patch
- Fall back to manual editing when the AI result is incomplete or unusable

Out of scope:

- no multi-photo AI refinement
- no repeated AI passes after guided photos
- no AI price logic
- no buyer-side changes

## Current Issue

The current browser path already calls the AI draft endpoint once after first-photo upload. However, the browser applies the result field by field and preserves existing values when a field is missing. That means a provider can return an incomplete patch and still produce a half-filled review form.

This is why the seller can currently see:

- category filled
- description filled
- title empty

The system is behaving as though partial AI output is acceptable. For seller trust, it should not.

## Design

### Browser behavior

- The browser should continue to call AI only after the first photo upload succeeds.
- The browser should apply the AI result exactly once.
- That AI application should be atomic:
  - a complete AI patch fills all four editable fields together
  - an incomplete AI patch is treated as manual fallback
- The draft should record that AI has already been applied so later guided-photo uploads do not re-trigger or re-merge AI output.

### API behavior

- The API should continue to normalize provider output server-side.
- The API should treat `title` as required for a `ready` AI result.
- The API should return `manual_fallback` if:
  - title is empty
  - category is unusable after normalization
  - the provider output is malformed
  - the provider call fails
- The API response shape stays the same:
  - `status: "ready"` with `draftPatch`
  - or `status: "manual_fallback"` with message

### Prompt behavior

- The vision prompt should explicitly require:
  - a concise product title
  - a single allowed Zwibba `categoryId`
  - a single allowed condition value
  - a short description
- It should instruct the model to return all four fields together, not partially.
- It should still forbid any price output.

### UX behavior

- The seller review screen should continue to show a single trust hint such as `Brouillon préparé à partir de votre photo`.
- That hint should only appear when the AI result is complete enough to be applied.
- If AI falls back to manual mode, the seller should see the existing manual message and keep full editing control.

## Testing

- API tests:
  - complete provider output returns `ready`
  - missing title returns `manual_fallback`
  - malformed provider output returns `manual_fallback`
- Browser tests:
  - first-photo upload applies title/category/condition/description together
  - guided-photo upload does not trigger a second AI pass
  - manual fallback leaves the form editable without partial AI state
- Live verification:
  - upload one real product photo on Railway
  - confirm review shows AI title, category, condition, and description together
  - confirm guided photos do not change those fields automatically

## Notes

- This is not a second AI feature. It is a reliability fix for the existing first-photo autofill path.
- The seller should experience one AI extraction event, not staggered field population.
