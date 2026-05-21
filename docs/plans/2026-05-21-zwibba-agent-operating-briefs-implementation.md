# Zwibba Agent Operating Briefs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Land two root-level agent briefs on the Zwibba application branch — `CLAUDE.md` for Claude Code / Cowork and `AGENTS.md` for OpenAI Codex (CLI and cloud) — so every agent that touches the repo starts from the same documented understanding of the stack, the layout, the plans-driven workflow, and the execution rules.

**Architecture:** Two sibling Markdown files at the repo root. Same scope, two voices: `CLAUDE.md` favours prose and intent, `AGENTS.md` favours executable rules. Both cross-reference each other with a conflict-resolution clause ("most recently edited wins") and both codify the anti-hallucination rule. No code change, no dependency change. Self-contained plan — file contents are written inline below so the plan reproduces without depending on the local working tree.

**Tech Stack:** Markdown only. `ripgrep` (already in repo tooling) to verify content.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the "Current priority docs" list in `docs/plans/README.md`, keeping the existing list intact and preserving alphabetical-by-date ordering:

```
- `2026-05-21-zwibba-agent-operating-briefs-design.md`
- `2026-05-21-zwibba-agent-operating-briefs-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "agent-operating-briefs" docs/plans/README.md`
Expected: both new filenames appear, on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index agent operating briefs plans"
```

---

### Task 2: Add the Claude-facing brief at the repo root

**Files:**
- Create: `CLAUDE.md`

**Step 1: Write the failing change**

Create `CLAUDE.md` at the repository root with exactly the following content:

```markdown
# Zwibba — Claude operating brief

This file is read at the start of every Claude Code / Cowork session that runs in the Zwibba repository. It is the counterpart of `AGENTS.md` (which OpenAI Codex reads). The two files cover the same project but speak to different agents — keep them in sync.

Last refresh: 2026-05-21.

## What Zwibba is

Zwibba is a French-language classifieds platform for the Democratic Republic of the Congo. Sellers post listings from their phones (AI-assisted first-photo draft via Gemini, optional Google Vision enrichment), buyers browse a mobile-first PWA, and a small admin surface handles moderation. The brand and copy are in French; category names and product taxonomy follow the DRC market.

`main` only carries the public-facing Railway landing (4 files). The real application lives on `codex/website-vitrine-backup` — that branch is the source of truth for every directory described below.

## Repository shape

The repo is a Node + Flutter monorepo with one root `package.json` that orchestrates child workspaces. Roughly:

`App/` — the buyer/seller PWA. Plain vanilla JavaScript using native ES modules (`.mjs`). No bundler, no framework. Code is organised by feature: `App/features/{auth,chat,home,listings,post,profile,wallet}/` contains the `renderXxxScreen` functions and per-feature controllers; `App/services/` hosts the API clients (auth, chat, listings, media, profile, wallet, ai-draft); `App/models/` holds domain entities (listing draft, chat thread, moderation result); `App/utils/` is rendering helpers and render-state machines. Anything UI ships here.

`apps/admin/` — a small Node 18 TypeScript service (no NestJS). `src/main.ts` and `src/server.ts` boot the HTTP listener, `src/moderation/` hosts the moderation surface, `src/config/env.ts` handles env. Dev = `tsx watch`, build = `tsc`, tests run through `scripts/run-tests.mjs` (custom node `--test` runner).

`apps/api/` — the production backend. NestJS 11, Prisma 6, AWS S3 (via `@aws-sdk/client-s3` and pre-signed URLs). `src/ai/` is where the AI pipeline lives (Gemini provider, normalization, Google Vision hybrid fusion, conservative category disambiguation). Other modules: `src/auth`, `src/boost`, `src/chat`, `src/database`, `src/drafts`, `src/health`, `src/listings`, `src/media`, `src/moderation`, `src/wallet`. Migrations through `prisma migrate deploy` on start; seeders in `scripts/seed-*.ts`. Tests use the same custom runner as admin.

`apps/mobile/` — Flutter app (Dart >=3.4 <4.0). Currently a scaffold (`zwibba_mobile`, version 0.1.0+1) with `flutter_secure_storage`, `http`, `shared_preferences`. `flutter test` runs the suite.

`docs/plans/` — the design + implementation memory of the project, see below. This is load-bearing, not optional documentation.

`scripts/` — build (`scripts/build.mjs`), dev runners (`dev-api.sh`, `dev-admin.sh`), smokes (`smoke-monorepo.mjs`, `smoke-production-contracts.mjs`), and end-to-end internal-beta flows in `scripts/e2e/`.

`server.mjs` and `dist/` exist purely so Railway can serve the App and the landing as a static site. Don't confuse `dist/` with source — `dist/` is gitignored output of `scripts/build.mjs`.

## Plans-driven workflow (`docs/plans/`)

Every meaningful change to Zwibba lands as a **pair** of documents under `docs/plans/`:

- `YYYY-MM-DD-zwibba-{slug}-design.md` — what we're doing and why
- `YYYY-MM-DD-zwibba-{slug}-implementation.md` — how, broken into TDD tasks

The design doc follows a fixed skeleton: a one-line `**Date:**`, then `## Goal`, `## Problem`, `## Non-Goals`, `## Existing System`, `## Recommended Architecture` (numbered sub-sections). Style is plain English describing intent and constraints, not pseudo-code.

The implementation doc opens with the exact line `> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.` followed by `**Goal:**`, `**Architecture:**`, `**Tech Stack:**`. The rest is numbered tasks. Each task has a `**Files:**` block listing what to create or modify, then three steps: write the failing test or change, run a verification command and quote the expected output, commit with a specific `git commit -m "..."` message. This is strict TDD with one commit per task.

When asked to plan or implement a Zwibba feature, mirror this format exactly — the existing docs (e.g. `2026-05-02-zwibba-conservative-ai-category-disambiguation-design.md` and its implementation pair) are the canonical examples. The `docs/plans/README.md` index lists the active docs; new docs must be appended to it as their first Task.

## Branch and commit conventions

Feature work happens on `codex/{slug}` branches (the prefix is the historical signature of ChatGPT Codex cloud, but it's now the project convention regardless of who produces the commits — Claude, Codex, or hand). One commit per implementation Task. Commit messages follow the conventional-commits style already visible in the history (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

Merge to `main` is reserved for the landing. The application's stable trunk is the latest `codex/website-vitrine-backup` snapshot or a downstream `develop` branch if/when one is created.

## Running things locally

`npm run dev:api` and `npm run dev:admin` launch the backend services in watch mode (they delegate to `scripts/dev-*.sh`). `npm run build` produces the static `dist/` for the App + landing. The smokes are useful as cheap pre-commit checks: `smoke:app` for the build, `smoke:workspaces` to confirm the three sub-app manifests exist, `smoke:monorepo` for a wider sanity pass, `smoke:production-contracts` for cross-app contracts. The e2e flows in `scripts/e2e/` simulate the internal-beta seller, messaging, and device-matrix journeys; only run them when a plan explicitly says to.

For the API, Prisma is the source of truth for the schema and migrations; never hand-write SQL. For the App, never introduce a bundler or framework dependency — the no-build vanilla JS choice is deliberate.

## How Claude should work in this repo

Claude's primary role here is **producing high-quality plans** (the design + implementation pair) that Codex then executes. When asked for a Zwibba feature, the default flow is:

1. Read `docs/plans/README.md` and the two most recent plan pairs to pick up the current vocabulary and constraints.
2. Read the existing code under the feature directory the change will touch (`App/features/...`, `apps/api/src/...`, `apps/admin/src/...`, `apps/mobile/lib/...`).
3. Draft the design.md exactly in the shape described above. Be honest about the existing system — never invent files or APIs.
4. Draft the implementation.md as TDD tasks, each with verifiable commands and one specific commit message.
5. Surface the pair for review before any code is touched.

When Claude is asked to **implement** rather than plan, the `superpowers:executing-plans` sub-skill is the right tool — it walks the implementation.md task by task, runs the verification commands, and stops at any failure rather than papering over it.

Anti-hallucination rule for this repo: every claim about a file, function, table, env var, or API contract must be grounded in something Claude has actually read in the current branch. If unsure, read first or say so.

## Pointers across files

- `AGENTS.md` — the Codex-facing twin of this file. Read it before producing prompts for Codex so the two stay aligned.
- `docs/plans/README.md` — the active-plans index. Always update when adding a plan pair.
- `package.json` — the npm scripts at the repo root are the canonical entry points for build, test, smoke, and dev.
```

**Step 2: Verify the file is present and well-formed**

Run: `test -f CLAUDE.md && rg -n "Plans-driven workflow" CLAUDE.md`
Expected: the file exists and the header `## Plans-driven workflow (\`docs/plans/\`)` is found.

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md operating brief for Claude Code and Cowork"
```

---

### Task 3: Add the Codex-facing brief at the repo root

**Files:**
- Create: `AGENTS.md`

**Step 1: Write the failing change**

Create `AGENTS.md` at the repository root with exactly the following content:

```markdown
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
- `App/`: plain vanilla JavaScript, native ES modules (`.mjs`). No bundler, no framework, no transpilation. Modules import each other directly from the browser.
- Static site / preview: `server.mjs` at repo root serves `dist/` for Railway.

## Repository layout you can rely on

\`\`\`
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
  src/auth, src/boost, src/chat, src/config, src/database, src/drafts,
  src/health, src/listings, src/media, src/moderation, src/wallet
  prisma/               schema and migrations (treat as source of truth)
  scripts/seed-*.ts     seeders for locations and system listings

apps/mobile/            Flutter scaffold

docs/plans/             pair-doc planning system — see below
docs/deployment/        Railway production notes, internal beta QA
docs/assets/            asset credit notes

scripts/                build.mjs, dev-api.sh, dev-admin.sh, smokes, e2e flows
server.mjs              static Railway server
package.json            root scripts: build, smoke:*, dev:*, test, test:e2e:*
\`\`\`

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
5. **Don't introduce framework or bundler dependencies in `App/`.** It is intentionally framework-free vanilla ES modules. UI features land as `renderXxxScreen` functions and lightweight controllers.
6. **Don't hand-edit Prisma migrations.** Use the Prisma toolchain (`prisma migrate`) and commit generated files only.
7. **French copy.** Customer-facing strings are in French (DRC). Don't translate or anglicise existing strings without an explicit instruction from a plan.
8. **No invented APIs.** Every reference to a function, endpoint, table, env var, or file must be grounded in a file in the working tree. If something is missing, the plan must add it explicitly before referencing it.

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
```

Note for the executor: the two `\`\`\`` fences inside the "Repository layout you can rely on" section are escaped with backslashes in this implementation doc to keep the surrounding Markdown code block valid. When you write the file, replace the four backslash-fence sequences with normal triple backticks so the final `AGENTS.md` carries an unescaped fenced block.

**Step 2: Verify the file is present and well-formed**

Run: `test -f AGENTS.md && rg -n "Execution rules for Codex" AGENTS.md && rg -c "^\`\`\`$" AGENTS.md`
Expected: the file exists, the rules header is found, and the count of standalone triple-backtick lines is exactly 2 (the opening and closing of the "Repository layout" fenced block).

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add AGENTS.md operating brief for OpenAI Codex"
```

---

### Task 4: Verify the two briefs cross-reference correctly

**Files:**
- No file change in this task — verification only.

**Step 1: Write the failing change**

There is no code change; this task asserts the cross-reference contract documented in the design (each file points to the other). The "failing change" is the absence of a verification step in CI today — this task is the verification, performed once at plan time.

**Step 2: Verify both files reference each other**

Run: `rg -n "AGENTS.md" CLAUDE.md && rg -n "CLAUDE.md" AGENTS.md`
Expected: at least one match in each direction, in the "Pointers across files" section of each document.

**Step 3: Commit**

There is nothing to commit for Task 4 because no file was modified. Skip the commit step for this task and proceed. If the verification in Step 2 fails, stop and report which file is missing the cross-reference — do not amend Task 2 or Task 3 commits to fix it; create a follow-up plan.
