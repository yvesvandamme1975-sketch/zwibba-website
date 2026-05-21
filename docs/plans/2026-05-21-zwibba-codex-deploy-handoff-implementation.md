# Zwibba Codex Deploy Handoff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter à `AGENTS.md` une règle 9 qui documente le mode d'auto-deploy conditionnel attendu de Codex (push branch + PR + merge + railway up + smoke + rollback), plus une phrase de pointer croisé dans la section existante "Pointers across files". Étendre `tests/agents-md.test.mjs` pour assert la présence des tokens clés de la règle.

**Architecture:** Modifications dans `AGENTS.md` (insertion d'une règle 9 à la fin de "## Execution rules for Codex" + une phrase à la fin de "## Pointers across files") et dans `tests/agents-md.test.mjs` (ajout de 4 nouveaux tests de présence). Aucune modification de code applicatif, aucune modification de skill, aucune modification de CLAUDE.md. Ce plan est documentaire uniquement — l'implémentation du tooling viendra dans un plan v2 séparé.

**Tech Stack:** Markdown édition (`AGENTS.md`), node `--test` runner avec `node:fs/promises` (déjà utilisé dans `tests/agents-md.test.mjs`).

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the "Current priority docs" list in `docs/plans/README.md`, after the latest existing entry (`2026-05-21-zwibba-agents-md-ux-ui-conventions-implementation.md`), before the "Legacy docs" trailer:

```
- `2026-05-21-zwibba-codex-deploy-handoff-design.md`
- `2026-05-21-zwibba-codex-deploy-handoff-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "codex-deploy-handoff" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index codex-deploy-handoff plans"
```

---

### Task 2: Failing tests for rule 9 presence in AGENTS.md

**Files:**
- Modify: `tests/agents-md.test.mjs`

**Step 1: Write the failing tests**

Open `tests/agents-md.test.mjs`. After the existing five tests (which assert the UX/UI section), append four new tests that assert AGENTS.md mentions the rule 9 tokens:

```js
test('AGENTS.md rule 9 describes conditional auto-deploy', async () => {
  const content = await readAgents();
  assert.match(content, /conditional auto-deploy/i);
});

test('AGENTS.md rule 9 references the smoke marker convention', async () => {
  const content = await readAgents();
  assert.match(content, /smoke marker/i);
});

test('AGENTS.md rule 9 mentions railway redeploy for rollback', async () => {
  const content = await readAgents();
  assert.match(content, /railway redeploy/);
});

test('AGENTS.md rule 9 forbids pushing directly to the base branch', async () => {
  const content = await readAgents();
  assert.match(content, /Never push directly to/);
});
```

Re-use the existing `readAgents()` helper at the top of the file; do not duplicate it. The new tests follow the exact same shape as the five existing UX/UI tests so the file stays coherent.

**Step 2: Run test to verify it fails**

Run: `node --test tests/agents-md.test.mjs`
Expected: FAIL on all four new tests because rule 9 has not been written into AGENTS.md yet. The five pre-existing UX/UI tests must still pass.

**Step 3: Commit**

```bash
git add tests/agents-md.test.mjs
git commit -m "test: assert AGENTS.md describes conditional auto-deploy rule"
```

---

### Task 3: Add rule 9 and the pointer-cross sentence to AGENTS.md

**Files:**
- Modify: `AGENTS.md`

**Step 1: Write the code**

Open `AGENTS.md`. Locate the end of the section `## Execution rules for Codex` — it ends with rule 8 ("No invented APIs."). Append a new rule 9 directly after rule 8, in the same list, before the blank line that precedes the next section `## UX/UI conventions for App/`:

```
9. **At the end of a successful and verified run, trigger conditional auto-deploy.** When all tasks are committed, the full test suite passes (`npm test` and any task-specific commands), and `git status --short` is empty: (a) push the feature branch to `origin`, (b) open a pull request via `gh pr create` targeting `codex/website-vitrine-backup`, (c) merge that PR via `gh pr merge --squash --delete-branch`, (d) checkout `codex/website-vitrine-backup` in the deploy worktree (`/Users/pc/zwibba-website-worktrees/browser-live`) and `git pull --ff-only`, (e) capture the current Railway deploy id as the rollback target by reading `railway status --json` for the `website` service and storing its `latestDeployment.id`, (f) run `railway up --detach` from the deploy worktree, (g) poll `railway status --json` until the new deployment reaches `SUCCESS` (timeout ~5 min, 10 ticks of 30 s), (h) perform an HTTP smoke on `https://website-production-7a12.up.railway.app/` (must return 200) and on the plan-specific smoke marker defined in the implementation doc (typically a substring check on a path under `/assets/app/...`), (i) if any of these steps fails, attempt `railway redeploy <previous-id>` to restore the prior deploy and report the failure in detail. Never push directly to `codex/website-vitrine-backup` without a PR, never push to `main`, never accept a deploy whose smoke check did not pass. Doc-only plans (no `App/` change) may relax the smoke marker to HTTP 200 on `/` only — the implementation doc must state this explicitly.
```

Then locate the section `## Pointers across files`. Append at its very end (after the last existing line, before the end-of-file or any trailing blank lines) the following single sentence:

```
The zwibba-plan-writer skill orchestrates the four phases (plan design, implementation doc, codex exec, Phase 4 Railway deploy). Rule 9 above is the Codex-side counterpart that activates when the implementation doc includes a smoke marker.
```

Keep the existing wording of `## Pointers across files` untouched.

**Step 2: Run test to verify it passes**

Run: `node --test tests/agents-md.test.mjs`
Expected: PASS — all nine assertions green (the five pre-existing UX/UI tests + the four new auto-deploy tests added in Task 2).

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add rule 9 for conditional auto-deploy to AGENTS.md"
```

---

### Task 4: Full test suite verification

**Files:**
- None (cross-cutting verification only)

**Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS on every test in `tests/*.test.mjs`. In particular `tests/agents-md.test.mjs` must be green on all nine assertions. Pre-existing tests (`tests/app-home.test.mjs`, `tests/in-app-brand.test.mjs`, `tests/internal-beta-assets.test.mjs`, etc.) must remain green. A doc-only change must not cause regressions; if it does, investigate before considering the plan done.

**Step 2: Confirm no extra files were modified**

Run: `git status --short`
Expected: empty output — every change from this plan has already been committed by the previous tasks. If anything is dirty, investigate before continuing.

**Step 3: Skip the commit step for this task because no file was modified.**
