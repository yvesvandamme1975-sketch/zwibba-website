# Zwibba Real Image Draft Autofill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Zwibba’s stubbed first-photo AI draft helper with real image-based server-side auto-fill that suggests title, category, condition, and description from the first uploaded product photo.

**Architecture:** Keep the existing browser upload-to-R2 flow intact, then call a new API-backed vision adapter with the uploaded photo URL. Use Gemini 2.5 Flash-Lite as the primary provider, then Claude 3.5 Haiku and Pixtral 12B as ordered fallbacks. Normalize provider output on the server, return a stable draft patch to the browser, and fall back cleanly to manual editing when every provider fails or returns unusable JSON.

**Tech Stack:** Vanilla JS browser app, NestJS API, Node test runner, Railway, Cloudflare R2, Gemini API, Anthropic API, Mistral API via server-side `fetch`

---

### Task 1: Lock the new AI request/response contract with failing tests

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/ai-draft.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/ai/ai-draft.e2e-spec.ts`

**Step 1: Write the failing tests**

- Update the browser AI draft tests to expect requests based on a real uploaded photo URL instead of preset-only behavior.
- Update the post-flow tests to assert that only the first uploaded photo triggers AI draft preparation.
- Update the API AI test to assert the response shape contains only `title`, `categoryId`, `condition`, and `description`, plus a success/fallback status.

**Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/ai-draft.test.mjs tests/post-flow.test.mjs
pnpm -C apps/api test -- ai-draft
```

Expected: FAIL because the current API/browser contract still depends on canned preset behavior.

**Step 3: Write the minimal implementation needed for test targets**

- Adjust test fixtures so uploaded-photo metadata is passed through explicitly.
- Keep assertions narrow and focused on the new contract, not on provider internals.

**Step 4: Run tests to verify the contract is still red for the right reason**

Run:

```bash
node --test tests/ai-draft.test.mjs tests/post-flow.test.mjs
pnpm -C apps/api test -- ai-draft
```

Expected: FAIL on missing new API behavior, not on broken test setup.

**Step 5: Commit**

```bash
git add tests/ai-draft.test.mjs tests/post-flow.test.mjs apps/api/test/ai/ai-draft.e2e-spec.ts
git commit -m "test: lock real image ai draft contract"
```

### Task 2: Add API env contract and provider adapter seam

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/config/env.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/.env.example`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/config/env.test.ts`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/vision-draft-provider.ts`

**Step 1: Write the failing test**

- Extend env tests to require the new AI provider configuration in production mode.
- Add coverage for optional development defaults if those are retained.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C apps/api test -- config
```

Expected: FAIL because no AI provider env contract exists yet.

**Step 3: Write the minimal implementation**

- Add env fields for:
  - `AI_PROVIDER`
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
  - optional `ANTHROPIC_API_KEY`
  - optional `ANTHROPIC_MODEL`
  - optional `MISTRAL_API_KEY`
  - optional `MISTRAL_MODEL`
- Keep the provider seam small with one exported interface like `generateDraftFromImage(...)`.
- Document production env requirements in `.env.example`.

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C apps/api test -- config
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/config/env.ts apps/api/.env.example apps/api/test/config/env.test.ts apps/api/src/ai/vision-draft-provider.ts
git commit -m "feat: add ai provider env contract"
```

### Task 3: Replace the stubbed API AI service with real image analysis

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/ai.controller.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/ai.service.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/ai.module.ts`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/gemini-vision-draft-provider.ts`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/anthropic-vision-draft-provider.ts`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/mistral-vision-draft-provider.ts`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/fallback-vision-draft-provider.ts`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/ai-taxonomy.ts`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/ai-normalization.ts`

**Step 1: Write the failing tests**

- Add service-level tests for:
  - valid provider JSON -> normalized draft patch
  - invalid `categoryId` -> normalized fallback
  - invalid `condition` -> normalized fallback
  - provider failure -> manual fallback status

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm -C apps/api test -- ai-draft
```

Expected: FAIL because the current service still returns canned draft patches.

**Step 3: Write the minimal implementation**

- Change the controller to accept `photoUrl` and related metadata.
- Implement provider adapters for Gemini, Claude, and Mistral with Gemini first in the chain.
- Add server-side normalization that:
  - constrains categories to Zwibba values
  - constrains condition to Zwibba values
  - strips any price output even if the model attempts it
- Return a stable API shape:
  - `status: "ready"` with `draftPatch`
  - or `status: "manual_fallback"` with message

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm -C apps/api test -- ai-draft
pnpm -C apps/api exec tsc --noEmit
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/ai/ai.controller.ts apps/api/src/ai/ai.service.ts apps/api/src/ai/ai.module.ts apps/api/src/ai/gemini-vision-draft-provider.ts apps/api/src/ai/anthropic-vision-draft-provider.ts apps/api/src/ai/mistral-vision-draft-provider.ts apps/api/src/ai/fallback-vision-draft-provider.ts apps/api/src/ai/ai-taxonomy.ts apps/api/src/ai/ai-normalization.ts apps/api/test/ai
git commit -m "feat: add real image ai draft service"
```

### Task 4: Rewire the browser AI client to use the uploaded photo URL

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/services/ai-draft.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/post/post-flow-controller.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/ai-draft.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`

**Step 1: Write the failing tests**

- Expect the browser AI client to send `photoUrl` from the uploaded primary photo.
- Expect first-photo capture to apply the returned AI patch to the draft.
- Expect guided-photo uploads not to retrigger AI preparation.

**Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/ai-draft.test.mjs tests/post-flow.test.mjs
```

Expected: FAIL because the browser still uses the stubbed local mapping path.

**Step 3: Write the minimal implementation**

- Replace local canned browser mapping with an API-backed request.
- Keep the browser-side fallback message path intact.
- Make the first-photo AI step depend on the uploaded photo’s real `publicUrl`.

**Step 4: Run tests to verify they pass**

Run:

```bash
node --test tests/ai-draft.test.mjs tests/post-flow.test.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add App/services/ai-draft.mjs App/features/post/post-flow-controller.mjs tests/ai-draft.test.mjs tests/post-flow.test.mjs
git commit -m "feat: connect browser drafts to real image ai"
```

### Task 5: Add seller-facing trust hint and fallback coverage

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/post/review-form-screen.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/app.css`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`

**Step 1: Write the failing test**

- Add browser coverage for the review hint indicating the draft was prepared from the uploaded photo.
- Add fallback coverage proving the seller can continue when AI returns `manual_fallback`.

**Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/post-flow.test.mjs
```

Expected: FAIL because the UI does not yet show the new prepared-from-photo hint or fallback behavior.

**Step 3: Write the minimal implementation**

- Render a small hint only when AI successfully filled the draft from the first uploaded image.
- Keep the UI concise and non-blocking.
- Preserve manual editing if AI fails.

**Step 4: Run test to verify it passes**

Run:

```bash
node --test tests/post-flow.test.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add App/features/post/review-form-screen.mjs App/app.css tests/post-flow.test.mjs
git commit -m "feat: surface ai image draft hint"
```

### Task 6: Verify locally and on the live beta

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/docs/plans/README.md`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/docs/plans/2026-03-28-zwibba-real-image-draft-autofill-design.md`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/docs/plans/2026-03-28-zwibba-real-image-draft-autofill-implementation.md`

**Step 1: Run focused verification**

Run:

```bash
pnpm -C apps/api test -- ai-draft
pnpm -C apps/api test -- config
pnpm -C apps/api exec tsc --noEmit
node --test tests/ai-draft.test.mjs tests/post-flow.test.mjs
npm run smoke:app
```

Expected: PASS

**Step 2: Run live beta verification**

Run a real seller flow on Railway:

1. upload a real first product photo
2. confirm title/category/condition/description are prefilled from AI
3. confirm manual price remains empty/manual
4. edit one AI-filled field manually
5. publish successfully

Expected: PASS, with fallback behavior still safe if the AI provider is unavailable.

**Step 3: Commit final docs state**

```bash
git add docs/plans/README.md docs/plans/2026-03-28-zwibba-real-image-draft-autofill-design.md docs/plans/2026-03-28-zwibba-real-image-draft-autofill-implementation.md
git commit -m "docs: add real image ai draft plan"
```
