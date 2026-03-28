# Zwibba Atomic First-Photo AI Patch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make first-photo seller autofill atomic so title, category, condition, and description are produced together from one AI vision response and applied once.

**Architecture:** Keep the current upload-to-R2 flow and first-photo AI trigger. Tighten the API so incomplete AI responses become `manual_fallback`, then tighten the browser so it applies only one complete patch and never re-applies AI during guided photos.

**Tech Stack:** Vanilla JS browser app, NestJS API, Node test runner, Railway, Cloudflare R2, Gemini/Claude/Mistral provider chain

---

### Task 1: Lock atomic AI behavior with failing tests

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/ai-draft.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/ai/ai-draft.e2e-spec.ts`

**Red**
- Add a browser test asserting first-photo AI fills `title`, `categoryId`, `condition`, and `description` together.
- Add a browser test asserting guided-photo uploads do not call AI again.
- Add an API test asserting missing title produces `manual_fallback` instead of a partial `ready` patch.

**Green**
- Update code only enough to satisfy those atomic contract tests.

**Verify**
```bash
node --test tests/ai-draft.test.mjs tests/post-flow.test.mjs
pnpm -C apps/api test -- ai-draft
```

### Task 2: Tighten API validation for complete AI output

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/ai.service.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/ai-normalization.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/vision-provider-prompt.ts`

**Red**
- Ensure tests fail when the normalized patch has an empty title.

**Green**
- Require the prompt to return all four fields.
- Add a completeness check after normalization.
- Return `manual_fallback` when title is empty or the patch is otherwise unusable.

**Verify**
```bash
pnpm -C apps/api test -- ai-draft
pnpm -C apps/api exec tsc --noEmit
```

### Task 3: Make browser AI application single-pass and non-partial

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/post/post-flow-controller.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/models/listing-draft.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/services/ai-draft.mjs`

**Red**
- Browser tests should fail until the draft records one completed AI application and rejects incomplete ready patches.

**Green**
- Add a draft-level `ai.applied` flag or equivalent runtime state.
- Apply the AI patch only once, after first-photo upload.
- Treat incomplete `ready` payloads as manual fallback on the browser side too, for defense in depth.

**Verify**
```bash
node --test tests/ai-draft.test.mjs tests/post-flow.test.mjs
```

### Task 4: Verify seller review behavior

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/post/review-form-screen.mjs` (only if test proves it is needed)

**Red**
- Add a review test proving AI title appears when the patch is complete.

**Green**
- Keep the review screen bound directly to the draft state with no separate second processing path.

**Verify**
```bash
node --test tests/post-flow.test.mjs
npm run smoke:app
```

### Task 5: Live validation

**Files:**
- No required code changes if previous tasks are green

**Verify**
- Deploy if website/API bundles changed
- Upload one real product photo on Railway
- Confirm:
  - title is populated
  - category/condition/description are populated from the same AI result
  - guided photos do not trigger AI again
