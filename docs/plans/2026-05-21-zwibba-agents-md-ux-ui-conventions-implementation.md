# Zwibba Agents MD UX/UI Conventions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter à `AGENTS.md` une nouvelle section `## UX/UI conventions for App/` qui code les règles visuelles, BEM, escaping, ARIA et mobile-first FR déjà présentes dans le code, pour que Codex produise des features cohérentes sans inférence.

**Architecture:** Une seule modification de fichier `AGENTS.md` (insertion d'une nouvelle section entre "Execution rules for Codex" et "Commands you'll actually run") plus un test léger de présence dans `tests/agents-md.test.mjs` qui assert que la nouvelle section contient les tokens clés (`var(--green)`, `escapeHtml`, `aria-label`, `mobile-first`). Pas de modification de code applicatif, pas de modification de CSS, pas de modification de `CLAUDE.md`.

**Tech Stack:** Markdown édition (`AGENTS.md`), node `--test` runner avec `node:fs/promises` pour lire le fichier et assert son contenu.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the "Current priority docs" list in `docs/plans/README.md`, after the latest existing entry (`2026-05-21-zwibba-home-header-beta-badge-implementation.md`), before the "Legacy docs" trailer:

```
- `2026-05-21-zwibba-agents-md-ux-ui-conventions-design.md`
- `2026-05-21-zwibba-agents-md-ux-ui-conventions-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "agents-md-ux-ui-conventions" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index agents-md-ux-ui-conventions plans"
```

---

### Task 2: Failing test for the new AGENTS.md UX/UI section

**Files:**
- Create: `tests/agents-md.test.mjs`

**Step 1: Write the failing test**

Create `tests/agents-md.test.mjs` with node `--test` covering the presence of the future section and its key tokens:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const agentsMdPath = fileURLToPath(new URL('../AGENTS.md', import.meta.url));

async function readAgents() {
  return await readFile(agentsMdPath, 'utf8');
}

test('AGENTS.md exposes a UX/UI conventions section for App/', async () => {
  const content = await readAgents();
  assert.match(content, /^##\s+UX\/UI conventions for App\/\s*$/m);
});

test('AGENTS.md UX/UI section references the canonical CSS variable usage', async () => {
  const content = await readAgents();
  assert.match(content, /var\(--green\)/);
});

test('AGENTS.md UX/UI section references the escaping helpers', async () => {
  const content = await readAgents();
  assert.match(content, /escapeHtml/);
});

test('AGENTS.md UX/UI section references the ARIA labelling convention', async () => {
  const content = await readAgents();
  assert.match(content, /aria-label/);
});

test('AGENTS.md UX/UI section calls out the mobile-first principle', async () => {
  const content = await readAgents();
  assert.match(content, /mobile-first/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/agents-md.test.mjs`
Expected: FAIL on every assertion except possibly `escapeHtml` (which already appears elsewhere in AGENTS.md, though that's coincidental — verify by reading the file). The first test (section header `## UX/UI conventions for App/`) is the most reliable failure signal.

**Step 3: Commit**

```bash
git add tests/agents-md.test.mjs
git commit -m "test: assert AGENTS.md exposes UX/UI conventions"
```

---

### Task 3: Add the UX/UI conventions section to AGENTS.md

**Files:**
- Modify: `AGENTS.md`

**Step 1: Write the code**

Open `AGENTS.md`. Locate the end of the section `## Execution rules for Codex` — it ends with rule 8 ("No invented APIs."). Insert a new top-level section `## UX/UI conventions for App/` between rule 8 and the next existing section `## Commands you'll actually run`. The new section must:

- Open with a one-paragraph rationale stating that these conventions apply to any markup, style or copy change in `App/` and that they are extracted from existing code, not invented.
- Contain five `### ` sub-sections in this exact order: `### Color palette and design tokens`, `### BEM class naming`, `### Component structure`, `### HTML escaping and ARIA`, `### Mobile-first FR`.
- In `### Color palette and design tokens`: list the canonical CSS variables defined in `src/site/styles.css` (`--bg`, `--bg-elevated`, `--surface`, `--surface-strong`, `--surface-soft`, `--text`, `--text-muted`, `--text-soft`, `--line`, `--green`, `--green-strong`, `--green-soft`, `--gold`, `--danger`, `--warning`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--shadow-soft`, `--shadow-green`, `--max-width`). State that `App/app.css` consumes them via `var(--…)` and that new rules in `App/` must do the same. Give two short examples: prefer `background: var(--green-soft)` over `background: rgba(107, 230, 107, 0.12)`, and `border-radius: var(--radius-md)` over `border-radius: 22px`. Note the single locally-declared exception `--app-mobile-nav-height: 88px` in `App/app.css`.
- In `### BEM class naming`: require the `.app-` prefix for every selector under `App/`. Spell out the structure `.app-{block}`, `.app-{block}__{element}`, `.app-{block}--{modifier}`, `.app-{block}__{element}--{modifier}`. Cite four real examples: `.app-flow__button--danger`, `.app-brand-mark--compact`, `.app-capture-result__hero-media--fallback`, `.app-detail__media--placeholder`. State that transient states use the utility classes `.is-active`, `.is-busy`, `.is-loading`, `.is-error` and cohabit with BEM in the same `class` attribute.
- In `### Component structure`: every `App/` component exports a function `renderXxxScreen({...} = {})` (or `renderXxx({...} = {})` for shared components) that returns an HTML template string. No DOM manipulation in the render function — lifecycle logic lives in controllers (`App/features/*/...controller.mjs`) and services (`App/services/`). Options must have defaults via destructuring `{...} = {}` so the function can be called without arguments in tests. The render function is pure. Cite `renderAppTabShell` in `App/components/app-tab-shell.mjs` as the canonical example.
- In `### HTML escaping and ARIA`: every non-static interpolation in a template string must pass through `escapeHtml` (text) or `escapeAttribute` (attribute values), both imported from `App/utils/rendering.mjs`. No exceptions — including numeric counters and category IDs. ARIA: `aria-label` mandatory on text-less interactions; `aria-hidden="true"` on decorative icons; `alt=""` (empty, not omitted) on decorative images; `<nav aria-label="…">` on every nav. Use `data-*` attributes (`data-action`, `data-category-id`, `data-tab-id`) for controller targeting; avoid `id="…"` unless required.
- In `### Mobile-first FR`: every user-facing copy is in French (DRC). English strings are tolerated only for internal debug tokens (data attributes, console.log). Layout is mobile-first: desktop styles come in `@media` above a breakpoint, not the other way around. Components must not assume hover — interactive states use `:active` and `.is-active`, not `:hover`. Viewport height is precious — avoid gratuitous vertical margins, target a high information density from the first viewport (reference plan `2026-03-22-zwibba-browser-phone-shell-refresh-design.md`).
- Close the section with a one-paragraph reminder: if this section is updated, the corresponding section in `CLAUDE.md` must be updated in the same commit or immediately after, per the existing rule in `## Pointers across files`.

Target length: 60-90 lines of markdown total for the whole new section. Prose, not bullet-only.

**Step 2: Run test to verify it passes**

Run: `node --test tests/agents-md.test.mjs`
Expected: PASS — all five assertions green (section header found, `var(--green)` present, `escapeHtml` present, `aria-label` present, `mobile-first` present).

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add UX/UI conventions section to AGENTS.md"
```

---

### Task 4: Full test suite verification

**Files:**
- None (cross-cutting verification only)

**Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS on every test in `tests/*.test.mjs`. In particular `tests/agents-md.test.mjs` (the new file) and all pre-existing tests (`tests/app-home.test.mjs`, `tests/in-app-brand.test.mjs`, `tests/internal-beta-assets.test.mjs`, etc.) must remain green. A doc-only change must not cause regressions; if it does, investigate before considering the plan done.

**Step 2: Confirm no extra files were modified**

Run: `git status --short`
Expected: empty output — every change from this plan has already been committed by the previous tasks. If anything is dirty, investigate before continuing.

**Step 3: Skip the commit step for this task because no file was modified.**
