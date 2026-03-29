# Zwibba Category Photo Rules Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `emploi` and `services` as seller categories, update guided-photo rules, and enforce the new vehicle photo minimums while keeping one-photo minimum publish behavior for all categories.

**Architecture:** Update shared category metadata in the browser and API, then extend the existing guided-photo model instead of adding a second validation system. Lock the behavior with TDD in browser and API tests before deploying website and API.

**Tech Stack:** Vanilla JS browser app, NestJS API, Node test runner, Railway deploys

---

### Task 1: Write browser failing tests for the new guidance rules

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`

**Step 1: Write the failing tests**

Add tests for:
- seller category list includes `Emploi` and `Services`
- `services` guidance renders `Carte de visite ou logo`
- `emploi` guidance renders `Logo ou visuel de l’entreprise`
- `vehicles` guidance renders `Avant`, `Arrière`, `Vue droite`, `Vue gauche`, `Intérieur`
- vehicle publish stays blocked until all five vehicle prompts are completed

**Step 2: Run test to verify it fails**

Run: `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`

**Step 3: Write minimal implementation**

Update browser category/guidance metadata and prompt labels.

**Step 4: Run test to verify it passes**

Run: `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`

**Step 5: Commit**

```bash
git add /Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/App/demo-content.mjs /Users/pc/zwibba-website-worktrees/browser-live/App/models/category-guidance.mjs /Users/pc/zwibba-website-worktrees/browser-live/App/features/post/photo-guidance-screen.mjs /Users/pc/zwibba-website-worktrees/browser-live/App/features/post/review-form-screen.mjs
git commit -m "feat: update browser category photo rules"
```

### Task 2: Write API failing tests for the new category taxonomy

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/ai/ai.service.test.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/listings/listings.e2e-spec.ts`

**Step 1: Write the failing tests**

Add tests for:
- AI normalization accepts `emploi`
- AI normalization accepts `services`
- listing category labels resolve `Emploi` and `Services`

**Step 2: Run test to verify it fails**

Run:
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- ai`
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- listings`

**Step 3: Write minimal implementation**

Update the supported category taxonomy, listing labels, and any label/fallback helpers.

**Step 4: Run test to verify it passes**

Run:
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- ai`
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- listings`

**Step 5: Commit**

```bash
git add /Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/ai-taxonomy.ts /Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/ai/vision-provider-prompt.ts /Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/listings/listings.service.ts /Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/ai/ai.service.test.ts /Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/listings/listings.e2e-spec.ts
git commit -m "feat: add emploi and services taxonomy"
```

### Task 3: Run the integrated app/API verification

**Files:**
- Verify only

**Step 1: Run browser tests**

Run:
- `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`

**Step 2: Run API tests**

Run:
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- ai`
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- listings`
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api exec tsc --noEmit`

**Step 3: Run app smoke**

Run:
- `npm run smoke:app`

**Step 4: Commit if needed**

```bash
git status
```

### Task 4: Deploy and verify live

**Files:**
- Deploy only

**Step 1: Deploy API**

Run:
- `railway up /Users/pc/zwibba-website-worktrees/browser-live/apps/api --path-as-root -s api -d -m "feat: update category photo rules"`

**Step 2: Deploy website**

Run:
- `railway up /Users/pc/zwibba-website-worktrees/browser-live --path-as-root -s website -d -m "feat: update category photo rules"`

**Step 3: Verify live behavior**

Check:
- seller category dropdown shows `Emploi` and `Services`
- `services` guidance shows `Carte de visite ou logo`
- `emploi` guidance shows `Logo ou visuel de l’entreprise`
- `vehicles` guidance shows the five required vehicle views

**Step 4: Record result**

Capture deploy IDs and summarize residual limits, if any.
