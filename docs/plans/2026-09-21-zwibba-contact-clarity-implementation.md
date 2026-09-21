# Zwibba Contact Clarity Implementation
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
**Goal:** Deliver the approved UX corrections on the existing site and web app.
**Architecture:** Existing pure renderers/controllers and shared tokens; no new framework.
**Tech Stack:** Vanilla ESM, Node test runner, esbuild, Railway.

### Task 1: Index the plan
**Files:** Create design/implementation pair; Modify docs/plans/README.md.
**Step 1:** Add both approved-scope plan documents to the index.
**Step 2:** Run: rg contact-clarity docs/plans/README.md. Expected: both filenames.
**Step 3:** git commit -m "docs: plan approved contact clarity improvements"

### Task 2: Add regression coverage
**Files:** Create tests/contact-clarity.test.mjs.
**Step 1:** Add failing tests for error recovery, accessible categories and contact before optional review; controller recovers on retry.
**Step 2:** Run: node --test tests/contact-clarity.test.mjs. Expected: new UI assertions fail before implementation, retry controller test passes.
**Step 3:** git commit -m "test: cover buyer recovery and contact priorities"

### Task 3: Implement approved UX refinements
**Files:** Modify App/features/home/*.mjs, App/features/listings/listing-detail-screen.mjs, App/features/profile/profile-screen.mjs, App/components/app-tab-shell.mjs, App/app.js, App/app.css, scripts/build.mjs, src/site/app.js, src/site/styles.css, src/site/locales/*.mjs and affected UI contract tests; Create DESIGN.md and verification report.
**Step 1:** Correct behavior and simplify hierarchy while retaining functional routes and brand. Update obsolete UI contracts explicitly when intentional layout changes invalidate them.
**Step 2:** Run: npm test; npm run build; npm run smoke:workspaces; npm run smoke:monorepo; npm run smoke:production-contracts. Expected: pass. Inspect desktop/mobile and one confirmation after any fixes. Run Impeccable detector once; verify findings in context.
**Step 3:** git commit -m "fix: prioritize discovery and seller contact"

### Delivery
Push feature branch, PR to codex/website-vitrine-backup, require CI and review before merge. Record website/API/admin prior release IDs and verify only affected website deployment. Smoke markers: retry-buyer-feed in /assets/app/app.js; country=CD in /; browser availability and early listing section. Verify asset SHA and live read-only routes. No outgoing messages or production test listings.
