# Zwibba Root Monorepo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn `zwibba-website` into the active Zwibba monorepo while keeping the current marketing site and browser prototype working.

**Architecture:** Keep `/App` as the UX prototype, keep the current website at the repo root, and add the real production workspaces under `apps/`. Build the repo foundation first, then port the validated seller flow into Flutter and connect it to a real NestJS backend plus a minimal moderation surface.

**Tech Stack:** Static website build at repo root, Flutter 3 for `apps/mobile`, NestJS 11 for `apps/api`, minimal admin web app for `apps/admin`, PNPM workspaces for JS packages, Node-based smoke checks.

---

### Task 1: Establish `zwibba-website` docs as the active source of truth

**Files:**
- Create: `docs/plans/2026-03-14-zwibba-root-monorepo-design.md`
- Create: `docs/plans/2026-03-14-zwibba-root-monorepo-implementation.md`
- Create: `docs/plans/README.md`
- Create: `docs/plans/2026-03-14-zwibba-doc-migration-notes.md`

**Step 1: Write the failing documentation smoke test**

- Add a root test that expects `docs/plans/` to exist and contain the new monorepo override docs.

**Step 2: Run the doc smoke test to verify failure**

Run: `test -f docs/plans/2026-03-14-zwibba-root-monorepo-design.md && test -f docs/plans/2026-03-14-zwibba-root-monorepo-implementation.md`
Expected: FAIL if the docs have not been created yet.

**Step 3: Write the minimal documentation**

- Record the architecture override.
- Record the execution plan for this repo.
- Add a short migration note explaining that `lubu-classifieds` is reference-only after the override.

**Step 4: Run the doc smoke test again**

Run: `test -f docs/plans/2026-03-14-zwibba-root-monorepo-design.md && test -f docs/plans/2026-03-14-zwibba-root-monorepo-implementation.md`
Expected: PASS.

**Step 5: Commit**

```bash
git add docs/plans
git commit -m "docs: set zwibba-website as monorepo source of truth"
```

### Task 2: Scaffold the real monorepo workspaces at repo root

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json`
- Create: `apps/mobile/pubspec.yaml`
- Create: `apps/mobile/lib/main.dart`
- Create: `apps/mobile/lib/app.dart`
- Create: `apps/mobile/lib/config/theme.dart`
- Create: `apps/mobile/lib/config/routes.dart`
- Create: `apps/api/package.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/admin/package.json`
- Create: `apps/admin/src/main.ts`

**Step 1: Write the failing workspace smoke checks**

- Add a root script that expects `apps/mobile`, `apps/api`, and `apps/admin` to exist.
- Add a test or smoke check that fails while those files are missing.

**Step 2: Run the smoke checks to verify failure**

Run: `test -f apps/mobile/pubspec.yaml && test -f apps/api/package.json && test -f apps/admin/package.json`
Expected: FAIL because the workspaces do not exist yet.

**Step 3: Write the minimal scaffold**

- Add the root workspace configuration.
- Add a minimal Flutter shell.
- Add a minimal NestJS shell.
- Add a minimal admin shell.

**Step 4: Run the smoke checks again**

Run: `test -f apps/mobile/pubspec.yaml && test -f apps/api/package.json && test -f apps/admin/package.json`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml apps/mobile apps/api apps/admin
git commit -m "chore: scaffold root zwibba monorepo apps"
```

### Task 3: Protect the existing website and `/App` prototype during the migration

**Files:**
- Modify: `package.json`
- Modify: `tests/build.test.mjs`
- Modify: `scripts/build.mjs`
- Modify: `server.mjs`

**Step 1: Write the failing compatibility tests**

- Verify the marketing site still builds.
- Verify `/App/` still loads.
- Verify the new workspace scaffold does not break existing website build/test scripts.

**Step 2: Run the compatibility tests to verify failure**

Run: `npm test`
Expected: FAIL only if the new monorepo wiring breaks the current website or prototype.

**Step 3: Write the minimal compatibility implementation**

- Keep existing website scripts operational.
- Ensure workspace additions do not interfere with current static build outputs.
- Keep local server behavior unchanged for the current site and prototype.

**Step 4: Run the compatibility tests again**

Run: `npm test`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json tests/build.test.mjs scripts/build.mjs server.mjs
git commit -m "test: protect website and prototype during monorepo bootstrap"
```

### Task 4: Start the real Flutter seller shell using the browser prototype as reference

**Files:**
- Modify: `apps/mobile/lib/app.dart`
- Create: `apps/mobile/lib/features/home/home_screen.dart`
- Create: `apps/mobile/lib/features/post/camera_screen.dart`
- Create: `apps/mobile/lib/features/post/photo_guidance_screen.dart`
- Create: `apps/mobile/lib/features/post/review_form_screen.dart`
- Create: `apps/mobile/lib/features/auth/welcome_screen.dart`
- Create: `apps/mobile/lib/features/auth/phone_input_screen.dart`
- Create: `apps/mobile/lib/features/auth/otp_screen.dart`
- Create: `apps/mobile/test/features/home/home_screen_test.dart`
- Create: `apps/mobile/test/features/post/post_flow_test.dart`
- Create: `apps/mobile/test/features/auth/publish_gate_test.dart`

**Step 1: Write the failing Flutter tests**

- Seller-first home CTA appears correctly.
- First photo starts a draft.
- OTP gate appears only when publish is attempted.

**Step 2: Run the Flutter tests to verify failure**

Run: `flutter test test/features/home/home_screen_test.dart test/features/post/post_flow_test.dart test/features/auth/publish_gate_test.dart`
Expected: FAIL because the real mobile shell does not exist yet.

**Step 3: Write the minimal Flutter implementation**

- Port the validated home/capture/guidance/review/auth flow from `App/`.
- Match the approved green/white/dark-grey design language.
- Use placeholder local state first.

**Step 4: Run the Flutter tests again**

Run: `flutter test test/features/home/home_screen_test.dart test/features/post/post_flow_test.dart test/features/auth/publish_gate_test.dart`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/mobile/lib apps/mobile/test
git commit -m "feat: add flutter seller flow shell"
```

### Task 5: Stand up the minimal API contracts for the seller flow

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/drafts/drafts.module.ts`
- Create: `apps/api/src/drafts/drafts.controller.ts`
- Create: `apps/api/src/drafts/drafts.service.ts`
- Create: `apps/api/src/ai/ai.module.ts`
- Create: `apps/api/src/ai/ai.controller.ts`
- Create: `apps/api/src/ai/ai.service.ts`
- Create: `apps/api/test/auth/publish-gate.e2e-spec.ts`
- Create: `apps/api/test/ai/ai-draft.e2e-spec.ts`

**Step 1: Write the failing API tests**

- OTP verify returns a session token.
- Draft sync accepts an authenticated draft.
- AI draft endpoint returns the structured seller draft response.

**Step 2: Run the API tests to verify failure**

Run: `pnpm -C apps/api test -- publish-gate`
Run: `pnpm -C apps/api test -- ai-draft`
Expected: FAIL because the modules do not exist.

**Step 3: Write the minimal NestJS implementation**

- Add auth request/verify endpoints.
- Add minimal draft sync endpoint.
- Add minimal AI draft endpoint with deterministic structured output.

**Step 4: Run the API tests again**

Run: `pnpm -C apps/api test -- publish-gate`
Run: `pnpm -C apps/api test -- ai-draft`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src apps/api/test
git commit -m "feat: add seller flow api contracts"
```

### Task 6: Add the minimal moderation admin shell

**Files:**
- Modify: `apps/admin/src/main.ts`
- Create: `apps/admin/src/moderation/moderation-page.ts`
- Create: `apps/admin/test/moderation-page.test.ts`

**Step 1: Write the failing admin test**

- A pending manual review item renders in the moderation queue.

**Step 2: Run the admin test to verify failure**

Run: `pnpm -C apps/admin test -- moderation`
Expected: FAIL because the moderation shell does not exist.

**Step 3: Write the minimal admin implementation**

- Render a simple moderation queue list.
- Show listing title, seller, status, and reason summary.

**Step 4: Run the admin test again**

Run: `pnpm -C apps/admin test -- moderation`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/admin/src apps/admin/test
git commit -m "feat: add moderation admin shell"
```

### Task 7: Add root bootstrap and developer scripts

**Files:**
- Modify: `package.json`
- Create: `scripts/smoke-monorepo.mjs`
- Create: `scripts/dev-api.sh`
- Create: `scripts/dev-admin.sh`

**Step 1: Write the failing root smoke check**

- Expect the root repo to verify website, prototype, and workspace presence together.

**Step 2: Run the smoke check to verify failure**

Run: `node scripts/smoke-monorepo.mjs`
Expected: FAIL until the script and wiring exist.

**Step 3: Write the minimal implementation**

- Add a root smoke script.
- Add helper scripts for API/admin local startup.
- Keep the current website start/build flow intact.

**Step 4: Run the smoke check again**

Run: `node scripts/smoke-monorepo.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json scripts
git commit -m "chore: add monorepo bootstrap scripts"
```
