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
