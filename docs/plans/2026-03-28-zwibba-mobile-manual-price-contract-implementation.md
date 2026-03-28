# Zwibba Mobile Manual Price Contract Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove AI-derived price suggestion fields from the Flutter/mobile draft contract so mobile also treats the seller-entered final price as the only price.

**Architecture:** Keep the existing Flutter seller flow intact, but delete the AI price fields from the mobile draft model and service mapping. Preserve compatibility by ignoring those legacy keys during JSON parsing.

**Tech Stack:** Flutter, Dart, Flutter test

---

### Task 1: Write the failing Flutter tests

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/mobile/test/services/ai_draft_api_service_test.dart`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/mobile/test/models/listing_draft_test.dart`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/mobile/test/features/post/post_flow_test.dart`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/mobile/test/features/auth/publish_gate_test.dart`

**Step 1: Write the failing tests**

- Make the AI draft service test expect no suggested-price fields on the resulting draft.
- Add a model test showing legacy JSON with AI price keys parses without retaining them.
- Remove suggested-price fields from widget-test fixtures so those tests express the new contract.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/pc/zwibba-website-worktrees/browser-live/apps/mobile
flutter test test/services/ai_draft_api_service_test.dart test/models/listing_draft_test.dart test/features/post/post_flow_test.dart test/features/auth/publish_gate_test.dart
```

Expected: FAIL because the mobile model and AI service still expose suggested-price fields.

### Task 2: Implement the minimal Flutter cleanup

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/mobile/lib/models/listing_draft.dart`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/mobile/lib/services/ai_draft_api_service.dart`

**Step 1: Write the minimal implementation**

- Remove the suggested-price fields from `ListingDraft`.
- Stop serializing and copying those fields.
- Ignore any legacy suggested-price keys during `fromJson`.
- Remove suggested-price mapping from `HttpAiDraftApiService`.

**Step 2: Run tests to verify they pass**

Run:

```bash
cd /Users/pc/zwibba-website-worktrees/browser-live/apps/mobile
flutter test test/services/ai_draft_api_service_test.dart test/models/listing_draft_test.dart test/features/post/post_flow_test.dart test/features/auth/publish_gate_test.dart
```

Expected: PASS

### Task 3: Regression verification

**Files:**
- No additional files required

**Step 1: Run broader mobile verification**

Run:

```bash
cd /Users/pc/zwibba-website-worktrees/browser-live/apps/mobile
flutter test
```

Expected: PASS

**Step 2: Commit**

```bash
git add apps/mobile/lib/models/listing_draft.dart apps/mobile/lib/services/ai_draft_api_service.dart apps/mobile/test/services/ai_draft_api_service_test.dart apps/mobile/test/models/listing_draft_test.dart apps/mobile/test/features/post/post_flow_test.dart apps/mobile/test/features/auth/publish_gate_test.dart docs/plans/2026-03-28-zwibba-mobile-manual-price-contract-design.md docs/plans/2026-03-28-zwibba-mobile-manual-price-contract-implementation.md
git commit -m "fix: remove ai price suggestions from mobile drafts"
```
