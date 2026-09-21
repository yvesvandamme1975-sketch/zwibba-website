# Zwibba Listing Before Seller Implementation
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
**Goal:** Show listing content above its seller.
**Architecture:** Move existing blocks in the pure renderer; preserve actions.
**Tech Stack:** ESM, Node tests, Railway.
### Task 1: Index plan
**Files:** Create this pair; Modify docs/plans/README.md.
**Step 1:** Index both documents.
**Step 2:** Run: rg listing-before-seller docs/plans/README.md. Expected: both documents.
**Step 3:** git commit -m "docs: record listing before seller correction"
### Task 2: Apply correction
**Files:** Modify App/features/listings/listing-detail-screen.mjs and tests/contact-clarity.test.mjs.
**Step 1:** Update existing order assertion and observe failure; reorder media/description/attributes before seller and contact. Keep contact before optional review.
**Step 2:** Run: npm test; npm run build; npm run smoke:production-contracts. Expected: pass. Verify production DOM order after CI and merge.
**Step 3:** git commit -m "fix: show listing content before seller"
### Delivery
PR to codex/website-vitrine-backup, CI then merge. Verify deployed JS hash and open listing photo/description before seller. No data mutation.
