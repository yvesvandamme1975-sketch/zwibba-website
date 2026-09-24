> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Instagram button initiate URL-only sharing.
**Architecture:** Scoped controller branch, existing optional image UI.
**Tech Stack:** Vanilla ESM, node:test, Playwright, existing Railway release.

## Task 1: Record scope

**Files:** Create this design/implementation pair; Modify docs/plans/README.md.

Step 1: Record the explicit scope and verification requirements.
Step 2: Run: `git diff --check`. Expected: no whitespace errors.
Step 3: Commit: `git commit -m "docs: plan Instagram direct link sharing"`.

## Task 2: Implement Instagram action

**Files:** Modify App/services/listing-share.mjs and tests/listing-share.test.mjs.

Step 1: Add failing tests for URL-only native sharing, desktop fallback and errors; retain TikTok, Facebook and WhatsApp contracts. Implement only after failure is confirmed.
Step 2: Run: `node --test tests/listing-share.test.mjs tests/share-menu.test.mjs`, `npm test`, `npm run build`, `npm run smoke:production-contracts`. Expected: green after correction; source diff restricted to Instagram behavior.
Step 3: Commit: `git commit -m "fix: launch Instagram sharing with the listing URL only"`.

Release via PR to codex/website-vitrine-backup, passing CI and verified Railway website deployment. Verify production payload by clicking the real Instagram button with navigator.share intercepted; verify desktop clipboard/inbox fallback. Replace the old Gmail draft without sending and update the existing intervention with evidence.
