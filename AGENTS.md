# Zwibba — Agent operating brief

This file is the OpenAI-convention entry point that Codex (CLI and cloud) reads at the start of every task. It is the counterpart of `CLAUDE.md` — both describe the same project, but this one is written for an autonomous coding agent. Keep them in sync.

Last refresh: 2026-05-21.

## Project in one paragraph

Zwibba is a French-language classifieds platform for the Democratic Republic of the Congo. The product is a mobile-first PWA (in `App/`) backed by a NestJS API (`apps/api/`), a small Node admin service (`apps/admin/`), and a Flutter mobile scaffold (`apps/mobile/`). The active development branch is `codex/website-vitrine-backup`; `main` only carries the public Railway landing.

## Stack and toolchain

- Node `>=18` at the repo root; npm orchestrates, pnpm runs the workspaces (`pnpm -C apps/api ...`, `pnpm -C apps/admin ...`).
- `apps/api`: NestJS 11, Prisma 6 (Postgres-backed via `@prisma/client`), AWS S3 via `@aws-sdk/client-s3`. TypeScript, ES modules. Dev with `tsx watch`, build with `tsc -p tsconfig.build.json`. Tests via `scripts/run-tests.mjs` (custom `node --test` harness).
- `apps/admin`: Node + TypeScript, ES modules, no framework. Same tsx/tsc tooling.
- `apps/mobile`: Flutter, Dart `>=3.4 <4.0`. Deps: `flutter_secure_storage`, `http`, `shared_preferences`. Tests with `flutter test`.
- `App/`: plain vanilla JavaScript, native ES modules (`.mjs`). No framework. Sources import each other directly and must stay runnable unbundled; `scripts/build.mjs` bundles them with esbuild into a single `dist/assets/app/app.js` for delivery only (one request instead of ~75 on first load).
- Static site / preview: `server.mjs` at repo root serves `dist/` for Railway.

## Repository layout you can rely on

```
App/                    PWA source (vanilla JS .mjs)
  app.js                entry: wires controllers + feature renders
  components/           shared shell + brand
  features/auth         welcome, phone input, OTP
  features/chat         inbox, thread, live-refresh controller
  features/home         home, buy, browse controller, post entry, recent feed
  features/listings     listing detail
  features/post         capture, photo guidance, publish gate, review form, success
  features/profile      profile screen + city autocomplete states
  features/wallet       wallet screen
  models/               listing-draft, chat-thread, moderation-result, category-guidance
  services/             ai-draft, api-config, auth, chat, draft-storage, image-compression,
                        listings, live-draft, media, profile, seller-listings, wallet
  utils/                rendering helpers, render-state machines, validators

apps/admin/             Node TS admin service
  src/main.ts           bootstrap
  src/server.ts         HTTP server
  src/moderation/       moderation surface
  src/config/env.ts     env config
  scripts/run-tests.mjs custom test runner

apps/api/               NestJS API
  src/ai/               Gemini, Google Vision hybrid fusion, normalization, disambiguation
  src/auth, src/boost, src/chat, src/common, src/config, src/database, src/drafts,
  src/health, src/listings, src/locations, src/media, src/moderation, src/profile, src/wallet
  prisma/               schema and migrations (treat as source of truth)
  scripts/seed-*.ts     seeders for locations and system listings

apps/mobile/            Flutter scaffold

docs/plans/             pair-doc planning system — see below
docs/deployment/        Railway production notes, internal beta QA
docs/assets/            asset credit notes

scripts/                build.mjs, dev-api.sh, dev-admin.sh, smokes, e2e flows
server.mjs              static Railway server
package.json            root scripts: build, smoke:*, dev:*, test, test:e2e:*
```

## The pair-document workflow you must follow

Every feature ships as two documents under `docs/plans/`:

1. **Design doc** — `YYYY-MM-DD-zwibba-{slug}-design.md`. Skeleton: `# Zwibba {Feature Title} Design`, then `**Date:**`, `## Goal`, `## Problem`, `## Non-Goals`, `## Existing System`, `## Recommended Architecture` (with numbered sub-sections). Prose, not pseudo-code. Honest about what exists today.

2. **Implementation doc** — `YYYY-MM-DD-zwibba-{slug}-implementation.md`. Opens with the literal line `> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.` Then `**Goal:**`, `**Architecture:**`, `**Tech Stack:**`. Then numbered tasks — each task has `**Files:**` (Create/Modify lines), and exactly three steps: Step 1 writes the failing test or change, Step 2 runs a specific verification command and states the expected output (`Run: ...`, `Expected: ...`), Step 3 commits with a precise `git commit -m "..."` message.

The first task of every implementation doc adds both new filenames to `docs/plans/README.md` and commits that change.

Existing pairs are the canonical templates. The most recent finished pair at the time of this writing is `2026-05-02-zwibba-conservative-ai-category-disambiguation-{design,implementation}.md` — read it before producing a new pair.

## Execution rules for Codex

When executing a plan, follow these without negotiation.

1. **Run the implementation doc top to bottom, one task at a time.** Do not batch tasks, do not skip the failing-test step, do not amend earlier commits.
2. **TDD is mandatory.** Step 1 of each task writes the failing state. Step 2's verification command must show the failure (or the post-change passing state) it claims. If the verification command output disagrees with the doc, stop and report — do not adjust the doc to match reality silently.
3. **One commit per task.** Use the exact commit message in Step 3. Don't add `Co-authored-by` lines or modify the message.
4. **Stay inside the working branch.** Feature work runs on `codex/{slug}`. Never push to `main` directly.
5. **Don't introduce framework dependencies in `App/`.** It is intentionally framework-free vanilla ES modules. UI features land as `renderXxxScreen` functions and lightweight controllers. The esbuild step in `scripts/build.mjs` is a delivery-time bundle, not a licence to add a framework, a router, or a second build step — `App/` sources stay plain ESM.
6. **Don't hand-edit Prisma migrations.** Use the Prisma toolchain (`prisma migrate`) and commit generated files only.
7. **French copy.** Customer-facing strings are in French (DRC). Don't translate or anglicise existing strings without an explicit instruction from a plan.
8. **No invented APIs.** Every reference to a function, endpoint, table, env var, or file must be grounded in a file in the working tree. If something is missing, the plan must add it explicitly before referencing it.
9. **At the end of a successful and verified run, trigger conditional auto-deploy.** When all tasks are committed, the full test suite passes (`npm test` and any task-specific commands), and `git status --short` is empty: (a) push the feature branch to `origin`, (b) open a pull request via `gh pr create` targeting `codex/website-vitrine-backup`, (c) merge that PR via `gh pr merge --squash --delete-branch`, (d) checkout `codex/website-vitrine-backup` in the deploy worktree (`/Users/pc/zwibba-website-worktrees/browser-live`) and `git pull --ff-only`, (e) capture the current Railway deploy id as the rollback target by reading `railway status --json` for the `website` service and storing its `latestDeployment.id`, (f) run `railway up --detach` from the deploy worktree, (g) poll `railway status --json` until the new deployment reaches `SUCCESS` (timeout ~5 min, 10 ticks of 30 s), (h) perform an HTTP smoke on `https://website-production-7a12.up.railway.app/` (must return 200) and on the plan-specific smoke marker defined in the implementation doc (typically a substring check on a path under `/assets/app/...`), (i) if any of these steps fails, attempt `railway redeploy <previous-id>` to restore the prior deploy and report the failure in detail. Never push directly to `codex/website-vitrine-backup` without a PR, never push to `main`, never accept a deploy whose smoke check did not pass. Doc-only plans (no `App/` change) may relax the smoke marker to HTTP 200 on `/` only — the implementation doc must state this explicitly.

## UX/UI conventions for App/

These conventions apply to every markup, style, or copy change under `App/`. They are extracted from the existing vanilla PWA code and CSS in this repository, not invented as a new design system, so new work should reinforce these patterns instead of introducing parallel ones.

### Color palette and design tokens

The canonical design tokens are defined in `src/site/styles.css`: `--bg`, `--bg-elevated`, `--surface`, `--surface-strong`, `--surface-soft`, `--text`, `--text-muted`, `--text-soft`, `--line`, `--green`, `--green-strong`, `--green-soft`, `--gold`, `--danger`, `--warning`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--shadow-soft`, `--shadow-green`, and `--max-width`.

`App/app.css` consumes these through `var(--...)`, and new rules in `App/` must do the same; use `var(--green)` for the canonical brand green. Prefer `background: var(--green-soft)` over `background: rgba(107, 230, 107, 0.12)`, and prefer `border-radius: var(--radius-md)` over `border-radius: 22px`.

The single locally declared exception is `--app-mobile-nav-height: 88px` in `App/app.css`, because the app shell needs a mobile navigation height token that does not belong to the public landing stylesheet.

### BEM class naming

Every selector under `App/` uses the `.app-` prefix. Structure block names as `.app-{block}`, elements as `.app-{block}__{element}`, modifiers as `.app-{block}--{modifier}`, and element modifiers as `.app-{block}__{element}--{modifier}`.

Real examples already in the codebase include `.app-flow__button--danger`, `.app-brand-mark--compact`, `.app-capture-result__hero-media--fallback`, and `.app-detail__media--placeholder`.

Transient states use the utility classes `.is-active`, `.is-busy`, `.is-loading`, and `.is-error`. They cohabit with BEM in the same `class` attribute, for example a selected item keeps its BEM selector and adds `.is-active`.

### Component structure

Every `App/` component exports a function named `renderXxxScreen({...} = {})`, or `renderXxx({...} = {})` for shared components, and returns an HTML template string. Options must have defaults through destructuring with `{...} = {}` so tests and controllers can call render functions without arguments.

Render functions are pure: no DOM reads, no event binding, no fetch calls, no timers, and no mutation of external state. Lifecycle logic belongs in controllers under `App/features/*/...controller.mjs` and shared effects belong in `App/services/`.

Use `renderAppTabShell` in `App/components/app-tab-shell.mjs` as the canonical example: it accepts explicit options, escapes interpolated values, and returns the shell markup without touching the DOM.

### HTML escaping and ARIA

Every non-static interpolation in a template string must pass through `escapeHtml` for text nodes or `escapeAttribute` for attribute values, both imported from `App/utils/rendering.mjs`. There are no exceptions, including numeric counters, category IDs, route fragments, and status values.

For accessibility, `aria-label` is mandatory on interactions that have no visible text, `aria-hidden="true"` belongs on decorative icons, decorative images use `alt=""` instead of omitting `alt`, and every navigation region uses `<nav aria-label="...">`.

Controllers target markup through `data-*` attributes such as `data-action`, `data-category-id`, and `data-tab-id`. Avoid `id="..."` unless a platform feature or label relationship specifically requires it.

### Mobile-first FR

Every user-facing string is French for the DRC product context. English strings are tolerated only for internal debug tokens such as `data-*` names and `console.log` output.

Layouts are mobile-first: base styles target the phone viewport, and desktop rules are added inside `@media` blocks above a breakpoint. Components must not assume hover availability; interactive states use `:active` and `.is-active`, not `:hover`, as the only signal.

Viewport height is precious in this PWA. Avoid gratuitous vertical margins, keep the first viewport information-dense, and preserve the browser phone shell direction captured in `2026-03-22-zwibba-browser-phone-shell-refresh-design.md`.

If this section changes, update the corresponding section in `CLAUDE.md` in the same commit or immediately after, following the existing rule in `## Pointers across files` that the agent briefs stay in sync.

## Commands you'll actually run

- Backend dev: `npm run dev:api`, `npm run dev:admin`
- Build the static site for the App and landing: `npm run build`
- Smoke battery: `npm run smoke:workspaces`, `npm run smoke:app`, `npm run smoke:monorepo`, `npm run smoke:production-contracts`
- Root unit tests: `npm test` (node `--test`)
- API tests: `pnpm -C apps/api test`
- Admin tests: `pnpm -C apps/admin test`
- Mobile tests: `cd apps/mobile && flutter test`
- E2E internal-beta flows (only when a plan calls for them): `npm run test:e2e:seller:beta`, `test:e2e:messages:beta`, `test:e2e:matrix:beta`, or the combined `test:e2e:beta`

## Pointers across files

- `CLAUDE.md` — the Claude-facing twin of this file. The two documents describe the same project; if you find a discrepancy, the most recently edited one wins and the other must be updated.
- `docs/plans/README.md` — the active-plans index. Every new design/implementation pair must be added here as the first task of the implementation doc.
- `package.json` — the root scripts are the canonical entry points; don't shell out to lower-level commands unless a plan tells you to.

The zwibba-plan-writer skill orchestrates the four phases (plan design, implementation doc, codex exec, Phase 4 Railway deploy). Rule 9 above is the Codex-side counterpart that activates when the implementation doc includes a smoke marker.
