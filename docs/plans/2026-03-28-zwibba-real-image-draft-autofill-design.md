# Zwibba Real Image Draft Autofill Design

## Summary

Zwibba should prepare the seller draft from the **first real uploaded photo**, not from canned presets or filename heuristics. The browser app already uploads the first image to Cloudflare R2 before draft preparation, so the next step is to replace the stubbed AI layer with a real server-side vision integration that reads the uploaded image and suggests `title`, `categoryId`, `condition`, and `description`.

The seller remains fully in control:

- price stays fully manual
- all suggested fields stay editable
- guided follow-up photos remain for listing completeness and moderation, not repeated AI rewriting

## Scope

- Analyze only the **first uploaded photo**
- Return only:
  - `title`
  - `categoryId`
  - `condition`
  - `description`
- Keep the existing browser upload flow and R2 object storage
- Replace the current stubbed AI contract with a real server-side multimodal provider
- Normalize model output to Zwibba enums and safe defaults
- Fall back cleanly to manual editing if AI is unavailable or returns unusable output

Out of scope:

- no AI price suggestion
- no custom training
- no multi-photo re-analysis
- no buyer-side AI behavior
- no schema migration

## Current State

Today the AI draft path is still a stub:

- the browser calls `aiDraftService.generateDraft(uploadedPhoto)` after first-photo upload
- the browser-side fallback logic uses simple photo identifiers and canned text
- the API `POST /ai/draft` accepts `photoPresetId` and returns hardcoded draft patches

So the product currently behaves like an assisted prototype, not real image recognition.

## Design

### Browser app

- Keep the existing first-photo upload order:
  1. user chooses or captures first photo
  2. browser compresses it
  3. browser uploads it to R2
  4. browser calls the AI draft step with the uploaded photo metadata
  5. browser applies the returned patch to the draft
- Change the browser AI client to send the real uploaded photo URL and object metadata instead of a preset identifier.
- Keep the returned patch narrow and editable.
- Show a lightweight seller-facing hint such as `Brouillon préparé à partir de votre photo`.
- If AI fails, continue with a manual draft and no blocking error.

### API

- Replace the stubbed AI service with a server-side provider adapter.
- The API should accept:
  - `photoUrl`
  - optional supporting metadata such as `objectKey`, `contentType`, and existing draft title if later useful
- The first provider for beta should be a hosted multimodal model accessed from the API. No browser-side provider calls.
- Use an env-backed adapter so the provider can be swapped later without changing the browser contract.
- The provider request should ask for strict JSON only, constrained to Zwibba’s supported taxonomy.

### Provider choice

- Use a hosted multimodal API, not custom training, for beta.
- OpenAI’s official Responses API supports image inputs, which fits Zwibba’s current “uploaded image URL in, structured JSON out” flow.
- The API layer should isolate provider details behind a small service boundary so future swaps remain localized.

### Output normalization

- Validate and normalize every field server-side before returning it.
- `categoryId` must resolve to one of Zwibba’s supported categories.
- `condition` must resolve to one of Zwibba’s supported condition values.
- Empty or malformed model output should fall back to safe defaults:
  - empty title allowed if necessary
  - category fallback to a conservative default such as `electronics`
  - empty description allowed but non-breaking
- The API response format should remain stable even if the provider response changes internally.

### Failure handling

- Timeout, provider error, bad JSON, or untrusted output must not block seller progress.
- On failure, the API should return a `manual_fallback` style result the browser already understands, or a normalized empty patch with explicit fallback status.
- Browser copy should make it clear the seller can continue manually.
- No retry storm is needed for this beta. One attempt on first photo is enough.

### Security and privacy

- The browser never sends provider credentials.
- The API should only send the uploaded photo URL and minimal prompt context needed for classification.
- Use the already uploaded R2 object instead of resending image bytes from the browser.
- Keep prompts narrow and structured to reduce hallucinated fields.

## Testing

- API tests:
  - successful image-based draft suggestion
  - malformed provider JSON gets normalized safely
  - provider failure returns manual fallback
  - no price fields appear anywhere in the response
- Browser tests:
  - first uploaded photo triggers AI draft request with real photo URL
  - returned patch fills title/category/condition/description
  - failed AI response still leaves seller in editable flow
  - guided photos do not retrigger AI
- Live verification:
  - upload a real product photo on Railway
  - confirm the seller review screen is prefilled from AI
  - confirm the seller can override any field manually

## Rollout

- Ship behind the existing live browser beta without changing the route structure.
- Keep fallback behavior active from day one so AI outages do not break seller posting.
- After rollout, evaluate suggestion quality from tester feedback before deciding whether any category-specific tuning is necessary.

## Notes

- This beta does **not** need model training to start.
- The correct first milestone is real hosted vision inference plus strict normalization.
- If accuracy later proves weak for local marketplace categories, that can be handled with prompt refinement, taxonomy mapping, or a later fine-tuning/classifier phase.
