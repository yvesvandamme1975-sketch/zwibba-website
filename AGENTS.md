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
