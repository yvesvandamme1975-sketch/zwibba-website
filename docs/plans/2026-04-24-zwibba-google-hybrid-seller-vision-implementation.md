# Zwibba Google Hybrid Seller Vision Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Google hybrid seller vision pipeline where Gemini stays the primary draft generator and Google Cloud Vision enriches OCR/logo/label signals before Zwibba returns one normalized seller draft.

**Architecture:** Extend the existing AI provider layer with a Google Cloud Vision enrichment adapter and add a fusion step inside the API. Keep the browser contract unchanged: first photo in, one `ready` draft or `manual_fallback` out.

**Tech Stack:** NestJS API, existing Zwibba AI provider abstractions, Google Gemini, Google Cloud Vision API, Node test runner, TypeScript.

---

### Task 1: Add the Google hybrid plan docs to the planning index

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Add the two new April 24 plan filenames to the active plans list in `docs/plans/README.md`.

**Step 2: Verify the diff is present**

Run: `rg -n "google-hybrid-seller-vision" docs/plans/README.md`
Expected: both design and implementation filenames appear

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index google hybrid seller vision plans"
```

### Task 2: Add environment contract for Cloud Vision enrichment

**Files:**
- Modify: `apps/api/src/config/env.ts`
- Modify: `apps/api/.env.example`
- Test: `apps/api/test/config/env.test.ts`

**Step 1: Write the failing test**

Add tests covering:
- feature flag off by default
- Cloud Vision config accepted when enabled
- startup fails cleanly if Cloud Vision is enabled but required config is missing

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- config/env.test.ts`
Expected: FAIL because Cloud Vision config is not supported yet

**Step 3: Write minimal implementation**

Add env fields such as:
- `AI_GOOGLE_VISION_ENRICHMENT_ENABLED`
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_CLOUD_VISION_API_KEY`

Expose them under a small nested config block in `loadEnv()`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- config/env.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/config/env.ts apps/api/.env.example apps/api/test/config/env.test.ts
git commit -m "feat: add cloud vision enrichment env contract"
```

### Task 3: Define the Google Vision signal model

**Files:**
- Create: `apps/api/src/ai/google-vision-signals.ts`
- Test: `apps/api/test/ai/ai.service.test.ts`

**Step 1: Write the failing test**

Add a test that expects a typed structured signal object shape to exist and be usable in AI orchestration code.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- ai.service`
Expected: FAIL because the signal model does not exist yet

**Step 3: Write minimal implementation**

Create shared types like:

```ts
export type GoogleVisionSignals = {
  labels: string[];
  logos: string[];
  ocrText: string;
  objects: string[];
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- ai.service`
Expected: PASS or next failure moves to provider wiring

**Step 5: Commit**

```bash
git add apps/api/src/ai/google-vision-signals.ts apps/api/test/ai/ai.service.test.ts
git commit -m "feat: add google vision signal model"
```

### Task 4: Add the Cloud Vision enrichment provider

**Files:**
- Create: `apps/api/src/ai/google-cloud-vision-enrichment-provider.ts`
- Create: `apps/api/src/ai/google-cloud-vision-utils.ts`
- Test: `apps/api/test/ai/ai.service.test.ts`

**Step 1: Write the failing test**

Add tests that verify:
- labels are parsed
- OCR text is flattened
- logos are extracted
- provider failure surfaces as a handled enrichment failure, not a crash

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- ai.service`
Expected: FAIL because the provider does not exist

**Step 3: Write minimal implementation**

Implement a small adapter that:
- calls Google Cloud Vision
- extracts `labels`, `logos`, `ocrText`, and optionally `objects`
- returns empty arrays/strings safely when sections are absent

Do not make it produce a seller draft directly.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- ai.service`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/ai/google-cloud-vision-enrichment-provider.ts apps/api/src/ai/google-cloud-vision-utils.ts apps/api/test/ai/ai.service.test.ts
git commit -m "feat: add cloud vision enrichment provider"
```

### Task 5: Add draft fusion logic

**Files:**
- Create: `apps/api/src/ai/google-hybrid-draft-fusion.ts`
- Test: `apps/api/test/ai/ai.service.test.ts`

**Step 1: Write the failing test**

Add tests for:
- Gemini-only result stays unchanged when Vision adds no strong signal
- OCR brand/model enriches title when Gemini title is generic
- OCR-heavy categories can improve category confidence
- conflicting weak Vision signals do not override Gemini

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- ai.service`
Expected: FAIL because fusion logic does not exist

**Step 3: Write minimal implementation**

Implement a pure function that accepts:
- normalized Gemini draft candidate
- Google Vision signals

Return a merged draft candidate that:
- keeps Gemini primary
- uses OCR/logo/labels as secondary evidence only

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- ai.service`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/ai/google-hybrid-draft-fusion.ts apps/api/test/ai/ai.service.test.ts
git commit -m "feat: add google hybrid draft fusion"
```

### Task 6: Wire hybrid orchestration into AiService

**Files:**
- Modify: `apps/api/src/ai/ai.service.ts`
- Modify: `apps/api/src/ai/ai.module.ts`
- Test: `apps/api/test/ai/ai.service.test.ts`

**Step 1: Write the failing test**

Add orchestration tests covering:
- Gemini success + Vision success -> fused `ready`
- Gemini success + Vision failure -> Gemini-only `ready`
- Gemini failure + Vision success -> `manual_fallback`
- feature flag off -> current behavior unchanged

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- ai.service`
Expected: FAIL because AiService does not orchestrate enrichment yet

**Step 3: Write minimal implementation**

Update `AiService` and module wiring so that:
- Gemini primary provider still generates the candidate draft
- Cloud Vision enrichment runs in parallel when enabled
- fusion happens before final normalization/completeness checks

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- ai.service`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/ai/ai.service.ts apps/api/src/ai/ai.module.ts apps/api/test/ai/ai.service.test.ts
git commit -m "feat: wire google hybrid ai orchestration"
```

### Task 7: Add rollout gating for selected categories

**Files:**
- Modify: `apps/api/src/ai/google-hybrid-draft-fusion.ts`
- Test: `apps/api/test/ai/ai.service.test.ts`

**Step 1: Write the failing test**

Add tests asserting that OCR/logo enrichment only influences configured categories first:
- `services`
- `emploi`
- `education`
- `construction`
- `food`

And that categories outside the rollout keep Gemini-dominant behavior.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- ai.service`
Expected: FAIL because rollout gating is not implemented

**Step 3: Write minimal implementation**

Add a small allowlist for enrichment-sensitive categories and only apply stronger OCR/logo fusion there.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- ai.service`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/ai/google-hybrid-draft-fusion.ts apps/api/test/ai/ai.service.test.ts
git commit -m "feat: gate google vision fusion by category"
```

### Task 8: Add operational logging

**Files:**
- Modify: `apps/api/src/ai/ai.service.ts`
- Test: `apps/api/test/ai/ai.service.test.ts`

**Step 1: Write the failing test**

Add tests that verify structured logging for:
- Gemini provider failure
- Cloud Vision enrichment failure
- manual fallback path
- hybrid fusion used vs skipped

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- ai.service`
Expected: FAIL because no explicit logging hooks exist

**Step 3: Write minimal implementation**

Add minimal structured logs without leaking secrets or raw image payloads.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- ai.service`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/ai/ai.service.ts apps/api/test/ai/ai.service.test.ts
git commit -m "chore: log google hybrid vision outcomes"
```

### Task 9: Run focused verification

**Files:**
- Modify if needed: AI files touched above

**Step 1: Run targeted tests**

Run:

```bash
pnpm -C apps/api test -- ai.service
pnpm -C apps/api test -- config/env.test.ts
pnpm -C apps/api exec tsc --noEmit
```

Expected: all PASS

**Step 2: Fix any failures minimally**

If any targeted failure appears, make the smallest code change needed to return to green.

**Step 3: Commit stabilization if needed**

```bash
git add apps/api/src apps/api/test
git commit -m "test: stabilize google hybrid seller vision"
```

### Task 10: Prepare deployment instructions

**Files:**
- Modify: `docs/plans/README.md`
- Optionally modify: `apps/api/.env.example`

**Step 1: Document rollout variables**

Ensure the final docs mention:
- feature flag
- required Google config
- rollout categories

**Step 2: Run a final repo check**

Run:

```bash
git status --short
```

Expected: clean working tree

**Step 3: Commit docs polish if needed**

```bash
git add docs/plans/README.md apps/api/.env.example
git commit -m "docs: finalize google hybrid seller vision rollout notes"
```

### Task 11: Deploy and live-check

**Files:**
- No code changes expected

**Step 1: Deploy API**

Run:

```bash
railway up -s api . --path-as-root
```

From:

```bash
cd /Users/pc/zwibba-website-worktrees/browser-live/apps/api
```

Expected: deployment reaches `SUCCESS`

**Step 2: Verify health**

Run:

```bash
curl -s https://api-production-b1b58.up.railway.app/healthz
```

Expected: `{"database":"up","status":"ok"}`

**Step 3: Run a live seller draft check**

Use a real uploaded image in an OCR-relevant category and confirm:
- `title` is non-empty
- `categoryId` is supported
- `description` is usable
- fallback still works if enrichment is disabled or unavailable

**Step 4: Commit operational note if required**

```bash
git add docs/plans
git commit -m "docs: capture live google hybrid verification notes"
```
