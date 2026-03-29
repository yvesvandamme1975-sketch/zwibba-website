# Zwibba Profile Zone Source-of-Truth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make seller zone profile-owned, remove manual zone selection from seller review, and require a saved profile zone before publish.

**Architecture:** Add a minimal authenticated profile API backed by `User.area`, then load that profile in the browser app and treat it as the single source of truth for new seller drafts. Keep `Draft.area` and `Listing.area` as persisted snapshots, but source them automatically from the saved seller profile instead of from a review-form dropdown.

**Tech Stack:** NestJS, Prisma/Postgres, vanilla browser app modules in `/App`, Node test runner, Railway

---

### Task 1: Add failing API tests for seller profile area

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/auth/demo-otp.e2e-spec.ts`
- Create or modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/profile/profile.e2e-spec.ts`

**Step 1: Write the failing test**

Add tests for:
- `GET /profile` returns authenticated `phoneNumber` and `area`
- `POST /profile` persists `area`
- empty `area` is rejected

**Step 2: Run test to verify it fails**

Run: `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- profile`
Expected: FAIL because no profile route/service exists yet.

**Step 3: Write minimal implementation**

Add the smallest controller/service surface needed to pass the tests.

**Step 4: Run test to verify it passes**

Run: `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- profile`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/test/profile/profile.e2e-spec.ts apps/api/src/profile
git commit -m "feat: add seller profile area api"
```

### Task 2: Add database support for profile area

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/prisma/schema.prisma`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/prisma/migrations/20260329_profile_area/migration.sql`

**Step 1: Write the failing test**

Use the profile API tests from Task 1 to prove persistence must reach Prisma.

**Step 2: Run test to verify it fails**

Run: `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- profile`
Expected: FAIL or remain red until `User.area` exists in schema/storage.

**Step 3: Write minimal implementation**

- Add `area String @default("")` to `User`
- Create the Prisma migration
- Regenerate Prisma client

**Step 4: Run test to verify it passes**

Run:
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api exec prisma generate`
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- profile`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260329_profile_area/migration.sql
git commit -m "feat: persist seller profile area"
```

### Task 3: Add browser profile area service tests

**Files:**
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/tests/profile-service.test.mjs`
- Create or modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/services/profile-service.mjs`

**Step 1: Write the failing test**

Cover:
- fetch profile returns `phoneNumber` and `area`
- save profile sends `area`
- invalid response handling

**Step 2: Run test to verify it fails**

Run: `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-service.test.mjs`
Expected: FAIL because the service does not exist yet.

**Step 3: Write minimal implementation**

Add a tiny browser API client for:
- `GET /profile`
- `POST /profile`

**Step 4: Run test to verify it passes**

Run: `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-service.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/services/profile-service.mjs tests/profile-service.test.mjs
git commit -m "feat: add browser profile area service"
```

### Task 4: Add failing browser profile UI tests

**Files:**
- Create or modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/profile-screen.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/profile/profile-screen.mjs`

**Step 1: Write the failing test**

Cover:
- profile renders `Ma zone`
- profile renders a zone selector
- profile renders current saved zone
- profile renders a save action

**Step 2: Run test to verify it fails**

Run: `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-screen.test.mjs`
Expected: FAIL because profile has no zone controls yet.

**Step 3: Write minimal implementation**

Render the zone editor in profile.

**Step 4: Run test to verify it passes**

Run: `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-screen.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/features/profile/profile-screen.mjs tests/profile-screen.test.mjs
git commit -m "feat: add profile zone editor"
```

### Task 5: Add failing review-form tests for read-only zone

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/post/review-form-screen.mjs`

**Step 1: Write the failing test**

Cover:
- review no longer renders `<select name="area">`
- review shows the profile zone as read-only
- review shows `Modifier dans le profil`
- missing zone shows the new profile-specific error state

**Step 2: Run test to verify it fails**

Run: `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`
Expected: FAIL because review still uses a manual zone selector.

**Step 3: Write minimal implementation**

Replace the review zone field with read-only profile-owned UI.

**Step 4: Run test to verify it passes**

Run: `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/features/post/review-form-screen.mjs tests/post-flow.test.mjs
git commit -m "feat: show profile-owned zone in review"
```

### Task 6: Add failing seller-flow tests for inherited profile area

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/app.js`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/models/listing-draft.mjs`

**Step 1: Write the failing test**

Cover:
- new draft inherits `profile.area`
- draft without area is backfilled when profile area loads
- publish validation blocks when profile area is missing

**Step 2: Run test to verify it fails**

Run: `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`
Expected: FAIL because draft area is still independently edited.

**Step 3: Write minimal implementation**

Load profile state into app bootstrap, hydrate drafts with profile area, and change validation copy to:
- `Définissez votre zone dans le profil avant de publier.`

**Step 4: Run test to verify it passes**

Run: `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add App/app.js App/models/listing-draft.mjs tests/post-flow.test.mjs
git commit -m "feat: inherit seller zone from profile"
```

### Task 7: Wire draft sync and publish to the profile-owned zone

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/services/live-draft-service.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/drafts/drafts.controller.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/drafts/drafts.service.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/moderation/moderation.service.ts`

**Step 1: Write the failing test**

Add API/browser tests proving:
- sync uses the zone coming from the profile-owned draft state
- publish rejects missing profile-backed zone cleanly

**Step 2: Run test to verify it fails**

Run:
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- drafts`
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- publish`

Expected: FAIL until the new validation and sync path are aligned.

**Step 3: Write minimal implementation**

Keep `Draft.area` and `Listing.area` as persisted values, but validate them as profile-owned on the browser path.

**Step 4: Run test to verify it passes**

Run the same tests again.
Expected: PASS

**Step 5: Commit**

```bash
git add App/services/live-draft-service.mjs apps/api/src/drafts apps/api/src/moderation
git commit -m "fix: enforce profile-owned seller zone at publish"
```

### Task 8: Run the full verification set

**Files:**
- No code changes unless a regression appears

**Step 1: Run browser tests**

Run:
- `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-service.test.mjs`
- `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-screen.test.mjs`
- `node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/post-flow.test.mjs`

Expected: PASS

**Step 2: Run API tests**

Run:
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- profile`
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- drafts`
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- publish`
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api exec prisma generate`
- `pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api exec tsc --noEmit`

Expected: PASS

**Step 3: Run app/build smoke**

Run:
- `npm run smoke:app`

Expected: PASS

**Step 4: Commit if any last fixes were needed**

```bash
git add -A
git commit -m "test: verify profile-owned seller zone flow"
```

### Task 9: Live beta verification and deploy

**Files:**
- Railway API deployment
- Railway website deployment if browser assets changed

**Step 1: Apply migration**

Run the production migration path for the API service.

**Step 2: Deploy**

Deploy:
- API
- website

**Step 3: Live check**

Verify on Railway:
- set zone in `#profile`
- start a new listing
- review shows zone read-only
- no zone dropdown appears
- publish succeeds with the saved profile zone
- clear or unset zone on a test user and confirm publish blocks with the profile message

**Step 4: Commit deployment/runbook updates if needed**

```bash
git add docs/deployment docs/plans/README.md
git commit -m "docs: update seller zone source-of-truth rollout"
```
