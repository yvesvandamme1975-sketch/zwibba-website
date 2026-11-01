# Zwibba Site/App Feedback Implementation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correct confirmed site/app feedback without changing listings or the Instagram flow.
**Architecture:** Existing live-card renderer, static build, server and vanilla PWA.
**Tech Stack:** Node, JavaScript modules, node:test, existing Playwright.

## Task 1: Record scope
**Files:** Create the design/implementation pair and modify docs/plans/README.md.
Step 1: Add both documents to the index.
Step 2: Run: `git diff --check`. Expected: no whitespace errors.
Step 3: Commit: `git commit -m "docs: scope Xavier site and app feedback"`.

## Task 2: Fix confirmed public discovery defects
**Files:** Modify shared/live-listings.mjs, src/site/app.js, src/site/locales/fr-cd.mjs, scripts/build.mjs, server.mjs, src/site/styles.css, App/features/listings/listing-detail-screen.mjs and relevant tests.
Step 1: Add failing regressions for live currency, actual counts, readable server listing body, country context and default social image, then make minimal fixes.
Step 2: Run: `npm test && npm run build && npm run smoke:production-contracts`. Expected: all checks pass; record browser checks for mobile and USD filtering. Release smoke marker: `Contacter le vendeur dans la web app` in public listing HTML.
Step 3: Commit: `git commit -m "fix: align public discovery with live listings"`.
