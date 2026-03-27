# Zwibba Manual Price Contract Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove AI-derived price suggestion fields from the browser/API contract so the seller always chooses the final price manually.

**Architecture:** Keep the existing seller flow and validation intact, but delete the AI price path from the browser draft model, AI response mapping, and API AI draft response. Sanitize old browser draft data on load so the contract stays clean.

**Tech Stack:** Vanilla JS browser app, NestJS API, Node test runner

---

### Task 1: Browser AI contract cleanup

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/ai-draft.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/services/ai-draft.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/models/listing-draft.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/post/post-flow-controller.mjs`

**Step 1: Write the failing tests**

- Make the browser AI draft test expect no suggested-price fields even if the AI response still includes a price range.
- Make the seller capture/post-flow test expect the resulting draft details to exclude suggested-price fields.

**Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/ai-draft.test.mjs tests/post-flow.test.mjs
```

Expected: FAIL because the current browser mapping still includes suggested-price fields.

**Step 3: Write the minimal implementation**

- Remove suggested-price mapping from the browser AI draft service.
- Sanitize browser draft details so old serialized drafts do not retain the removed fields.
- Stop copying suggested-price fields in AI patch application and ready-draft helpers.

**Step 4: Run tests to verify they pass**

Run:

```bash
node --test tests/ai-draft.test.mjs tests/post-flow.test.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add tests/ai-draft.test.mjs tests/post-flow.test.mjs App/services/ai-draft.mjs App/models/listing-draft.mjs App/features/post/post-flow-controller.mjs
git commit -m "fix: remove ai price suggestions from browser contract"
```

### Task 2: API AI response cleanup

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/ai/ai-draft.e2e-spec.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/ai.service.ts`

**Step 1: Write the failing test**

- Update the AI draft API e2e test to assert that the response no longer contains `suggestedPriceMinCdf` or `suggestedPriceMaxCdf`.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C apps/api test -- ai-draft
```

Expected: FAIL because the current API still returns suggested-price fields.

**Step 3: Write the minimal implementation**

- Remove suggested-price fields from the API AI draft response.

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C apps/api test -- ai-draft
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/test/ai/ai-draft.e2e-spec.ts apps/api/src/ai/ai.service.ts
git commit -m "fix: remove ai price suggestions from api drafts"
```

### Task 3: Regression verification

**Files:**
- No new files required

**Step 1: Run focused verification**

Run:

```bash
node --test tests/ai-draft.test.mjs tests/post-flow.test.mjs
pnpm -C apps/api test -- ai-draft
npm run smoke:app
```

**Step 2: Commit final state**

```bash
git add docs/plans/2026-03-27-zwibba-manual-price-contract-cleanup-design.md docs/plans/2026-03-27-zwibba-manual-price-contract-cleanup-implementation.md
git commit -m "docs: record manual price contract cleanup"
```
