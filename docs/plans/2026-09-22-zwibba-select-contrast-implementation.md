# Zwibba Select Contrast Implementation
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
**Goal:** Readable native dropdown options.
**Architecture:** Shared CSS tokens, native controls.
**Tech Stack:** CSS, Node tests, Railway.
### Task 1: Index plan
**Files:** Create this pair; Modify docs/plans/README.md.
**Step 1:** Record the supplied failing screenshot and index both documents.
**Step 2:** Run: rg select-contrast docs/plans/README.md. Expected: both documents.
**Step 3:** git commit -m "docs: record native select contrast correction"
### Task 2: Correct option colors
**Files:** Modify src/site/styles.css.
**Step 1:** Add explicit native select color-scheme and opaque option colors to correct the screenshot failure.
**Step 2:** Run: npm test; npm run build; npm run smoke:production-contracts. Expected: pass. Inspect an open native rating dropdown in browser and verify deployed CSS after CI and merge.
**Step 3:** git commit -m "fix: keep native dropdown options readable"
