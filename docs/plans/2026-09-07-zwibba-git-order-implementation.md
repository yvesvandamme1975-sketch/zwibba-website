# Zwibba Git Order Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reconcile the shipped web bundle with the application trunk and make the Git entry points unambiguous while preserving every existing worktree.

**Architecture:** Retain codex/website-vitrine-backup as the application trunk; make it GitHub default without rewriting main. Integrate the existing esbuild commits through a reviewed PR. Preserve divergent local docs and unpublished work in verified recovery artifacts. Document service-specific release checks and the user's Codex notification preference.

**Tech Stack:** Git, GitHub CLI/Actions, pnpm, Node, Railway.

## Task 1: Preserve and inspect
- Capture all refs in a verified Git bundle and all worktree diffs/untracked non-generated files outside the repository.
- Inspect 78f6fe5..cbead28 and ee1605e divergence; independent read-only review.
- Expected: preserved history, no unidentified runtime changes in the integration.

## Task 2: Reconcile the maintained source
- Start codex/git-order-2026-09-07 from cbead28 (contains the two existing integration commits).
- Add this plan to docs/plans/README.md; add README.md and docs/operations/git-and-releases.md; synchronize the dated operational section in AGENTS.md and CLAUDE.md.
- Run pnpm install --frozen-lockfile, npm run build, npm test, npm run smoke:production-contracts.
- Commit: docs: establish canonical git and release workflow

## Task 3: Review and merge
- Push only the integration branch; create PR against codex/website-vitrine-backup.
- Require successful CI and independent review. Capture active website/API deployment IDs before merge.
- Merge via PR. Verify Railway API and website individually; if website is not updated automatically, deploy only the verified clean checkout with commit SHA in its message.
- HTTP smoke: website /, /App/, /assets/app/app.js (bundled code, no relative imports) and API /healthz.

## Task 4: Restore clear entry points
- Change GitHub default to codex/website-vitrine-backup; retain main history unchanged.
- Archive browser-live's divergent docs on a named local archive branch and in the bundle; make browser-live a clean detached deployment checkout of the merged trunk.
- Move conflicting root untracked artifacts into the recovery directory with a manifest; switch the main workspace to the canonical application branch without deleting worktree data.
- Retain unmerged/dirty historical feature worktrees. Remove only proven-merged redundant branch refs if useful, after recording their SHAs.
- Verify canonical local branch equals origin and record the deployment receipts in the private recovery ledger.

## Task 5: Notifications
- User chose native Codex notifications on iPhone. Ask the user to verify task visibility and iOS permission; tool cannot control Codex settings or certify phone delivery.
- Keep completion and decision messages in this task. Do not claim a phone notification has arrived without user confirmation.
- Do not create a duplicate periodic scheduler merely to emulate native push.
