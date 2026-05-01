# Zwibba Category Expansion And Fashion Sizing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the `Musique`, `Santé`, and `Beauté` categories, rename the displayed `Construction` label to `Bricolage / Construction`, and add structured `Mode` attributes for `Type d’article` and `Taille`, including optional AI prefill when label evidence is strong.

**Architecture:** Keep existing category ids stable wherever possible and extend the shared taxonomy in both the browser app and API. Persist category-specific fashion data in `attributesJson` on `Draft` and `Listing`, then thread that structure through draft sync, publish, listing detail, and edit flows. Extend the seller AI draft contract so fashion item type and size can be suggested, but never required.

**Tech Stack:** Vanilla JS browser app, NestJS API, Prisma/Postgres, Node test runner, existing Gemini + Google Cloud Vision seller vision pipeline.

---

### Task 1: Extend the taxonomy labels in the browser app

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/demo-content.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/listings/listing-detail-screen.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/src/site/content.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/app-buyer-home.test.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/listing-detail-screen.test.mjs`

**Step 1: Write the failing tests**

Add assertions that:

- seller categories contain `Musique`, `Santé`, `Beauté`
- construction label is rendered as `Bricolage / Construction`
- listing detail maps `construction` to the new label

**Step 2: Run tests to verify they fail**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/app-buyer-home.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/listing-detail-screen.test.mjs
```

Expected: failures around missing category labels.

**Step 3: Write the minimal implementation**

Update category definitions and labels in:

- `sellerCategories`
- listing detail `categoryLabels`
- static site category metadata

**Step 4: Run tests to verify they pass**

Run the same command and confirm PASS.

**Step 5: Commit**

```bash
git -C /Users/pc/zwibba-website-worktrees/browser-live add App/demo-content.mjs App/features/listings/listing-detail-screen.mjs src/site/content.mjs tests/app-buyer-home.test.mjs tests/listing-detail-screen.test.mjs
git -C /Users/pc/zwibba-website-worktrees/browser-live commit -m "feat: expand browser category labels"
```

### Task 2: Extend API taxonomy and category labels

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/ai-taxonomy.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/listings/listings.service.ts`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/ai/ai.service.test.ts`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/listings/listings.e2e-spec.ts`

**Step 1: Write the failing tests**

Add coverage for:

- `music`, `health`, and `beauty` as supported category ids
- listing feed/detail labels returning `Musique`, `Santé`, `Beauté`, `Bricolage / Construction`

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- ai.service
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- listings/listings.e2e-spec.ts
```

Expected: unsupported category or label assertion failures.

**Step 3: Write the minimal implementation**

Update:

- `supportedCategoryIds`
- API listing label map

**Step 4: Run tests to verify they pass**

Run the same commands and confirm PASS.

**Step 5: Commit**

```bash
git -C /Users/pc/zwibba-website-worktrees/browser-live add apps/api/src/ai/ai-taxonomy.ts apps/api/src/listings/listings.service.ts apps/api/test/ai/ai.service.test.ts apps/api/test/listings/listings.e2e-spec.ts
git -C /Users/pc/zwibba-website-worktrees/browser-live commit -m "feat: expand API category taxonomy"
```

### Task 3: Add structured fashion attributes to Prisma models

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/prisma/schema.prisma`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/prisma/migrations/20260501100000_fashion_attributes_json/migration.sql`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/drafts/drafts-persistence.e2e-spec.ts`

**Step 1: Write the failing test**

Add a draft sync round-trip test asserting `attributesJson` is accepted, persisted, and returned for a `fashion` draft.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- drafts/drafts-persistence.e2e-spec.ts
```

Expected: response shape or persistence failure because `attributesJson` does not exist.

**Step 3: Write the minimal implementation**

Add nullable `attributesJson Json?` to:

- `Draft`
- `Listing`

Create a migration adding both columns.

**Step 4: Run Prisma generation and the test**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api exec prisma generate
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- drafts/drafts-persistence.e2e-spec.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git -C /Users/pc/zwibba-website-worktrees/browser-live add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260501100000_fashion_attributes_json/migration.sql apps/api/test/drafts/drafts-persistence.e2e-spec.ts
git -C /Users/pc/zwibba-website-worktrees/browser-live commit -m "feat: add fashion attributes JSON storage"
```

### Task 4: Thread `attributesJson` through draft sync and publish

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/drafts/drafts.controller.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/drafts/drafts.service.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/listings/listings.service.ts`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/drafts/drafts-persistence.e2e-spec.ts`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/listings/listings.e2e-spec.ts`

**Step 1: Write the failing tests**

Cover:

- `attributesJson` accepted on `/drafts/sync`
- published listings return the same `attributesJson`
- seller edit payload includes `attributesJson`

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- drafts/drafts-persistence.e2e-spec.ts
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- listings/listings.e2e-spec.ts
```

**Step 3: Write the minimal implementation**

Update controller/service DTO handling and listing detail serialization to preserve `attributesJson`.

**Step 4: Run tests to verify they pass**

Run the same commands and confirm PASS.

**Step 5: Commit**

```bash
git -C /Users/pc/zwibba-website-worktrees/browser-live add apps/api/src/drafts/drafts.controller.ts apps/api/src/drafts/drafts.service.ts apps/api/src/listings/listings.service.ts apps/api/test/drafts/drafts-persistence.e2e-spec.ts apps/api/test/listings/listings.e2e-spec.ts
git -C /Users/pc/zwibba-website-worktrees/browser-live commit -m "feat: sync fashion attributes through API"
```

### Task 5: Add browser-side fashion attribute helpers to the draft model

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/models/listing-draft.mjs`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/App/utils/fashion-attributes.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/listing-edit-draft.test.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`

**Step 1: Write the failing tests**

Add tests that:

- drafts normalize empty `attributesJson`
- fashion attributes survive draft update and edit rehydration
- size is cleared when item type changes incompatibly

**Step 2: Run tests to verify they fail**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/listing-edit-draft.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs
```

**Step 3: Write the minimal implementation**

Add:

- fashion item type constants
- size lists
- normalization helpers
- draft shape support for `attributesJson`

**Step 4: Run tests to verify they pass**

Run the same command and confirm PASS.

**Step 5: Commit**

```bash
git -C /Users/pc/zwibba-website-worktrees/browser-live add App/models/listing-draft.mjs App/utils/fashion-attributes.mjs tests/listing-edit-draft.test.mjs tests/post-flow.test.mjs
git -C /Users/pc/zwibba-website-worktrees/browser-live commit -m "feat: add browser fashion attribute helpers"
```

### Task 6: Render and validate `Type d’article` and `Taille` in the seller review form

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/post/review-form-screen.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/app.js`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/post/post-flow-controller.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/review-draft-render-state.test.mjs`

**Step 1: Write the failing tests**

Add coverage for:

- fields appear only when `categoryId === "fashion"`
- size select is disabled until item type is selected
- size options change by item type
- validation blocks publish for fashion without item type or size

**Step 2: Run tests to verify they fail**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/review-draft-render-state.test.mjs
```

**Step 3: Write the minimal implementation**

Update the form and submit handling to:

- read/write `attributesJson.fashion.itemType`
- read/write `attributesJson.fashion.size`
- clear incompatible size when item type changes
- validate both fields for `fashion`

**Step 4: Run tests to verify they pass**

Run the same command and confirm PASS.

**Step 5: Commit**

```bash
git -C /Users/pc/zwibba-website-worktrees/browser-live add App/features/post/review-form-screen.mjs App/app.js App/features/post/post-flow-controller.mjs tests/post-flow.test.mjs tests/review-draft-render-state.test.mjs
git -C /Users/pc/zwibba-website-worktrees/browser-live commit -m "feat: add fashion type and size fields"
```

### Task 7: Thread `attributesJson` through browser live draft and edit services

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/services/live-draft-service.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/services/listings-service.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/listings/listing-detail-screen.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/listing-edit-draft.test.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/listings-live-api.test.mjs`

**Step 1: Write the failing tests**

Add tests that:

- sync draft sends `attributesJson`
- edit listing rehydrates it
- listing detail renders the fashion `Détails` block

**Step 2: Run tests to verify they fail**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/listing-edit-draft.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/listings-live-api.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/listing-detail-screen.test.mjs
```

**Step 3: Write the minimal implementation**

Update browser services and listing detail rendering to preserve and display fashion attributes.

**Step 4: Run tests to verify they pass**

Run the same command and confirm PASS.

**Step 5: Commit**

```bash
git -C /Users/pc/zwibba-website-worktrees/browser-live add App/services/live-draft-service.mjs App/services/listings-service.mjs App/features/listings/listing-detail-screen.mjs tests/listing-edit-draft.test.mjs tests/listings-live-api.test.mjs tests/listing-detail-screen.test.mjs
git -C /Users/pc/zwibba-website-worktrees/browser-live commit -m "feat: persist fashion attributes in browser flows"
```

### Task 8: Extend the seller AI draft contract for optional fashion prefill

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/vision-provider-prompt.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/ai-normalization.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/ai.service.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/google-hybrid-draft-fusion.ts`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/ai/ai.service.test.ts`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/ai/google-hybrid-draft-fusion.test.ts`

**Step 1: Write the failing tests**

Add tests for:

- fashion AI response with strong `itemType` and `size`
- uncertain or mismatched signals producing no fashion prefill
- non-fashion categories ignoring the fashion attribute fields

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- ai.service
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- ai/google-hybrid-draft-fusion.test.ts
```

**Step 3: Write the minimal implementation**

Extend the AI contract to allow optional:

- `itemType`
- `size`

Only accept the pair for `fashion`, and only when both values form a valid combination.

**Step 4: Run tests to verify they pass**

Run the same commands and confirm PASS.

**Step 5: Commit**

```bash
git -C /Users/pc/zwibba-website-worktrees/browser-live add apps/api/src/ai/vision-provider-prompt.ts apps/api/src/ai/ai-normalization.ts apps/api/src/ai/ai.service.ts apps/api/src/ai/google-hybrid-draft-fusion.ts apps/api/test/ai/ai.service.test.ts apps/api/test/ai/google-hybrid-draft-fusion.test.ts
git -C /Users/pc/zwibba-website-worktrees/browser-live commit -m "feat: add optional AI fashion attribute prefill"
```

### Task 9: Final regression run and docs touch-up

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/docs/plans/README.md`

**Step 1: Update docs index**

Add the new design and implementation docs to `docs/plans/README.md`.

**Step 2: Run the focused regression suite**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/app-buyer-home.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/listing-detail-screen.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/listing-edit-draft.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/listings-live-api.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/review-draft-render-state.test.mjs
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- drafts/drafts-persistence.e2e-spec.ts
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- listings/listings.e2e-spec.ts
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- ai.service
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- ai/google-hybrid-draft-fusion.test.ts
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api exec prisma generate
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api exec tsc --noEmit
npm -C /Users/pc/zwibba-website-worktrees/browser-live run smoke:app
```

Expected: all commands PASS.

**Step 3: Commit**

```bash
git -C /Users/pc/zwibba-website-worktrees/browser-live add docs/plans/README.md
git -C /Users/pc/zwibba-website-worktrees/browser-live commit -m "docs: record category expansion and fashion sizing plans"
```
