# Zwibba Conservative AI Category Disambiguation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve seller-side AI category accuracy by adding a conservative disambiguation layer that prevents incorrect category promotion between nearby Zwibba rubriques.

**Architecture:** Keep Gemini as the primary category proposal source, then run a deterministic rule layer after normalization and before the final AI response is returned. Use OCR/logo/object/label signals only as supporting evidence, and only promote to a narrower category when the evidence is strong.

**Tech Stack:** NestJS API, TypeScript, existing Zwibba AI service/fusion modules, Node test runner.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Add the new May 2 design and implementation filenames to the active plans list.

**Step 2: Verify the diff is present**

Run: `rg -n "conservative-ai-category-disambiguation" docs/plans/README.md`
Expected: both new filenames appear

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index conservative ai category disambiguation plans"
```

### Task 2: Define the failing unit tests for conservative category disambiguation

**Files:**
- Create: `apps/api/test/ai/category-disambiguation.test.ts`

**Step 1: Write the failing test**

Add focused tests for:
- `services` stays `services` on business-card OCR without recruiting terms
- `emploi` wins only on strong recruiting OCR
- `music` does not override `electronics` for generic speaker/headphone signals
- `construction` wins on chantier/material/tool signals
- `beauty` and `health` do not cross-promote on weak generic bottle signals

Example shape:

```ts
test('does not promote services to emploi on generic business card OCR', () => {
  const result = disambiguateCategory({
    currentCategoryId: 'services',
    signals: {
      labels: ['Business card'],
      logos: ['Zwibba Pro'],
      objects: ['Document'],
      ocrText: 'ZWIBBA PRO\\nPlomberie\\n+243...',
    },
  });

  assert.equal(result.categoryId, 'services');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- ai/category-disambiguation.test.ts`
Expected: FAIL because the module does not exist yet

**Step 3: Commit**

```bash
git add apps/api/test/ai/category-disambiguation.test.ts
git commit -m "test: add conservative category disambiguation coverage"
```

### Task 3: Add the disambiguation module with minimal conservative heuristics

**Files:**
- Create: `apps/api/src/ai/category-disambiguation.ts`
- Test: `apps/api/test/ai/category-disambiguation.test.ts`

**Step 1: Write minimal implementation**

Create a pure function, for example:

```ts
export function disambiguateVisionCategory({
  draftPatch,
  signals,
}: {
  draftPatch: VisionDraftPatch;
  signals: GoogleVisionSignals;
}): VisionDraftPatch
```

Start with minimal helpers:
- normalize signal text
- detect strong recruiting phrases
- detect explicit musical-instrument phrases
- detect explicit construction phrases
- detect explicit health/beauty cues

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- ai/category-disambiguation.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/api/src/ai/category-disambiguation.ts apps/api/test/ai/category-disambiguation.test.ts
git commit -m "feat: add conservative category disambiguation rules"
```

### Task 4: Add strong-vs-weak evidence tests for non-promotion behavior

**Files:**
- Modify: `apps/api/test/ai/category-disambiguation.test.ts`

**Step 1: Write the failing test**

Add tests showing that:
- weak `beauty` hints do not promote from generic categories
- weak `health` hints do not promote from generic categories
- generic food/agriculture cues do not cross-promote without clear evidence
- ambiguous school/office objects do not force `education`

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- ai/category-disambiguation.test.ts`
Expected: FAIL on at least one missing rule

**Step 3: Write minimal implementation**

Extend the rule file with explicit “do not promote on weak evidence” guards.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- ai/category-disambiguation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/ai/category-disambiguation.ts apps/api/test/ai/category-disambiguation.test.ts
git commit -m "feat: harden conservative category promotion rules"
```

### Task 5: Wire disambiguation into `AiService`

**Files:**
- Modify: `apps/api/src/ai/ai.service.ts`
- Test: `apps/api/test/ai/ai.service.test.ts`

**Step 1: Write the failing test**

Add orchestration tests covering:
- Gemini says `electronics`, OCR strongly indicates `emploi` -> final result `emploi`
- Gemini says `electronics`, OCR weakly suggests `music` -> final result stays `electronics`
- Gemini says `services`, business-card OCR stays `services`

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- ai.service`
Expected: FAIL because `AiService` does not yet run the conservative module

**Step 3: Write minimal implementation**

In `AiService.generateDraft()`:
- keep current normalization
- keep current Google Vision fusion
- run conservative disambiguation before completeness checks and final return

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- ai.service`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/ai/ai.service.ts apps/api/test/ai/ai.service.test.ts
git commit -m "feat: apply conservative category disambiguation in ai service"
```

### Task 6: Expand the prompt with conservative category guardrails

**Files:**
- Modify: `apps/api/src/ai/vision-provider-prompt.ts`
- Test: `apps/api/test/ai/ai.service.test.ts`

**Step 1: Write the failing test**

Add assertions that the prompt now explicitly says:
- do not choose `emploi` without recruiting evidence
- do not choose `music` for generic audio electronics
- prefer a broader safe category when uncertain between close categories

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- ai.service`
Expected: FAIL because those prompt strings are not present yet

**Step 3: Write minimal implementation**

Append short conservative instructions to the existing prompt.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- ai.service`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/ai/vision-provider-prompt.ts apps/api/test/ai/ai.service.test.ts
git commit -m "feat: add conservative prompt guardrails for category choice"
```

### Task 7: Keep Google hybrid fusion focused on enrichment, not final arbitration

**Files:**
- Modify: `apps/api/src/ai/google-hybrid-draft-fusion.ts`
- Test: `apps/api/test/ai/google-hybrid-draft-fusion.test.ts`

**Step 1: Write the failing test**

Add tests verifying that this file remains responsible for:
- OCR/logo/title enrichment
- optional fashion metadata enrichment

but that risky final category arbitration is deferred to the new disambiguation layer.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- ai/google-hybrid-draft-fusion.test.ts`
Expected: FAIL if fusion still owns too much category logic

**Step 3: Write minimal implementation**

Refactor only if needed so that:
- obvious current safe enrichments remain
- the new conservative module is the final authority for close-category correction

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- ai/google-hybrid-draft-fusion.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/ai/google-hybrid-draft-fusion.ts apps/api/test/ai/google-hybrid-draft-fusion.test.ts
git commit -m "refactor: separate enrichment from final category arbitration"
```

### Task 8: Run the full targeted verification suite

**Files:**
- No code changes expected unless a regression appears

**Step 1: Run browser-side regression coverage**

Run:

```bash
node --test tests/ai-draft.test.mjs tests/post-flow.test.mjs tests/app-live-api.test.mjs
```

Expected: PASS

**Step 2: Run API-side targeted coverage**

Run:

```bash
pnpm -C apps/api test -- ai/category-disambiguation.test.ts
pnpm -C apps/api test -- ai.service
pnpm -C apps/api test -- ai/google-hybrid-draft-fusion.test.ts
pnpm -C apps/api exec tsc --noEmit
```

Expected: PASS

**Step 3: Run smoke build**

Run:

```bash
npm run smoke:app
```

Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "test: verify conservative ai category disambiguation"
```

### Task 9: Deploy and verify the live production path

**Files:**
- No source change required unless deployment reveals a regression

**Step 1: Deploy API**

Run:

```bash
railway up /Users/pc/zwibba-website-worktrees/browser-live/apps/api --path-as-root -s api -d -m "feat: improve conservative ai category disambiguation"
```

Expected: deployment created

**Step 2: Verify deployment success**

Run:

```bash
railway deployment list -s api
```

Expected: latest API deployment `SUCCESS`

**Step 3: Run live verification**

Run a few direct checks such as:

```bash
curl -sS https://api-production-b1b58.up.railway.app/healthz
```

Then test `/ai/draft` with:
- recruiting poster image
- service card image
- generic speaker image
- instrument image

Expected:
- explicit recruiting -> `emploi`
- service card -> `services`
- generic audio -> stays `electronics`
- instrument -> `music`

**Step 4: Commit any deployment-note updates if needed**

```bash
git add -A
git commit -m "docs: record conservative ai category verification"
```
