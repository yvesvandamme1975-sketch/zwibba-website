# Zwibba Agent Operating Briefs Design

**Date:** 2026-05-21

## Goal

Land two root-level agent briefs — `CLAUDE.md` and `AGENTS.md` — on the Zwibba application branch so that any AI coding agent that touches this repo (Claude Code / Cowork, OpenAI Codex CLI, ChatGPT Codex cloud) starts from the same shared understanding of the project, its conventions, and the plans-driven workflow.

## Problem

Today the repo has no machine-readable orientation file. New agent sessions discover the structure piecemeal:

- `main` only contains the Railway landing (four files), which makes the project look trivial to anyone who clones it.
- The real application sits on `codex/website-vitrine-backup` (about four hundred files spanning `App/`, `apps/admin`, `apps/api`, `apps/mobile`, `docs/plans/`), but nothing at the root signals that.
- The `docs/plans/` pair-document workflow — design.md + implementation.md, strict TDD per task, one commit per task — is observed in fifty-plus existing plans but never written down anywhere an agent can read at session start.
- Anti-hallucination rules ("never invent files, APIs, env vars") are implicit in the way Aives reviews the work but not codified.

The cost is real: agents waste tokens rediscovering the structure, occasionally invent files, and produce plans that drift from the established skeleton. With Claude now generating prompts that feed Codex, the gap is about to widen unless both agents are aligned on the same brief.

## Non-Goals

- No change to existing application code under `App/`, `apps/admin/`, `apps/api/`, `apps/mobile/`.
- No change to existing plans in `docs/plans/`.
- No introduction of new tooling, scripts, or dependencies.
- No edits to `main` or to the Railway-facing landing.
- No automation of the Claude→Codex handoff in this pass (that lands in a later plan once the briefs are in place).

## Existing System

The Zwibba repo lives at `github.com/yvesvandamme1975-sketch/zwibba-website`. Active application development happens on `codex/website-vitrine-backup`. The `docs/plans/` directory carries the project's institutional memory as dated pairs `YYYY-MM-DD-zwibba-{slug}-design.md` plus `-implementation.md`. The implementation docs already reference `superpowers:executing-plans` as the required Claude sub-skill, which means Claude is the planner-of-record and Codex (cloud or CLI) is the executor-of-record. What is missing is the document an agent reads first.

## Recommended Architecture

### 1. Two root-level briefs, one for each agent family

Add `CLAUDE.md` and `AGENTS.md` at the repo root on `codex/website-vitrine-backup`. `CLAUDE.md` is the file Claude Code and Cowork read automatically. `AGENTS.md` is the file OpenAI Codex CLI and Codex cloud read automatically. Same project, two voices: `CLAUDE.md` favours prose and intent, `AGENTS.md` favours executable rules and lists.

### 2. Shared content, divergent emphasis

Both files cover the same scope: what Zwibba is, the repo layout, the plans-driven workflow, the stack and toolchain, the commands that actually run. `CLAUDE.md` adds a section on how Claude should approach a Zwibba request (read recent plans, read touched code, draft the pair, surface for review). `AGENTS.md` adds a numbered "Execution rules for Codex" section that is non-negotiable (TDD mandatory, one commit per task, exact commit messages, no framework intro in `App/`, French copy preserved, no invented APIs).

### 3. Cross-referencing and conflict resolution

Each file points to the other and states that they describe the same project. If the two ever diverge, the most recently edited one wins and the other must be brought back in line. This is explicit so that nobody silently updates one and leaves the other stale.

### 4. Anti-hallucination clause in both files

Every claim about a file, function, env var, or API contract must be grounded in something the agent has actually read in the current branch. Unknown items are stated as unknown, never fabricated. This codifies a rule Aives already enforces by review.

### 5. Plans-driven workflow documented in both files

The exact skeleton of design.md (`# Zwibba {Title} Design`, `**Date:**`, `## Goal`, `## Problem`, `## Non-Goals`, `## Existing System`, `## Recommended Architecture` with numbered sub-sections) and the exact skeleton of implementation.md (header line referencing `superpowers:executing-plans`, then `**Goal:**`, `**Architecture:**`, `**Tech Stack:**`, then numbered tasks with `**Files:**`, three steps, exact commit message) are written down so the next plan a Codex session produces stays inside the established shape.
