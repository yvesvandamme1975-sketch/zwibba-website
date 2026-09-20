> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correct the Instagram/TikTok image-sharing path requested by Xavier.
**Architecture:** Reuse the existing image preparation controller and branded shareImageUrl with an explicit destination/export menu.
**Tech Stack:** Vanilla ESM, node:test, existing esbuild/Railway.

## Task 1: Record scope

**Files:** Create both 2026-09-20-zwibba-social-image-sharing design/implementation documents; Modify docs/plans/README.md.

Step 1: Write the plan pair and add the index entries.
Step 2: Run: `git diff --check`. Expected: no whitespace errors.
Step 3: Commit: `git commit -m "docs: plan branded social image sharing"`.

## Task 2: Implement verified image handoff

**Files:** Modify App/services/listing-share.mjs, App/components/share-menu.mjs, App/app.js, App/app.css, App/features/listings/listing-detail-screen.mjs and tests/listing-share.test.mjs, tests/share-menu.test.mjs, tests/listing-detail-screen.test.mjs.

Step 1: Add failing tests for the new menu, branded file source and visible Instagram/TikTok media/export controls. Confirm red before implementing the scoped fix.
Step 2: Run: `node --test tests/listing-share.test.mjs tests/share-menu.test.mjs tests/listing-detail-screen.test.mjs tests/success-screen.test.mjs`, then `npm test`, `npm run build`, `npm run smoke:production-contracts`. Expected: new tests fail before code and all tests pass after correction; review reports no unresolved critical findings. Release smoke marker: website bundle contains `Partagez l’image et choisissez` and `Enregistrez l’image puis importez-la`, and passes shareImageUrl into the controller.
Step 3: Commit: `git commit -m "fix: share branded listing images to social apps"`.

Release through a PR targeting codex/website-vitrine-backup. Follow docs/operations/git-and-releases.md, retain previous deployment identity, await CI and website SUCCESS at the merged SHA, verify public bundle/HTTP. No API/data release needed. Distinguish website delivery from phone acceptance and email receipt.

Review follow-up: notification wording follows preparing/unavailable/ready and file-sharing capability. Link captions remain neutral; the explicitly requested brand text remains in the image. Four additional tests fail before this follow-up and pass after it.
