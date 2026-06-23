# Zwibba Profile Identity And Public Seller Profile Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Donner une vraie identité vendeur (nom d'affichage éditable, monogramme d'initiales, ancienneté) et un profil vendeur public ouvrable depuis une annonce, tout en supprimant la donnée vendeur fabriquée (`responseTime` codé en dur, faux nom).

**Architecture:** Migration Prisma additive `User.displayName`. API : `GET /profile` enrichi (`displayName`, `memberSince`), `POST /profile/identity` validé via un validateur `apps/api/src/common/display-name.ts`, endpoint public `GET /sellers/:sellerId` (non authentifié) renvoyant identité + annonces actives approuvées, et `buildSellerProfile` rendu asynchrone pour consommer l'identité réelle (fallback neutre, `sellerId`, plus de `responseTime`). Front : `parseAppRoute`/`getRenderableRouteKey` étendus pour la route `#seller/{id}`, écran vendeur public, carte d'identité + bouton Déconnexion dans le profil, monogramme client. Tous les blindspots identifiés (cache de rendu, orphelins sans `User`, reset d'état au logout, fake Prisma e2e, usurpation `displayName`) sont des tasks explicites.

**Tech Stack:** NestJS API, Prisma 6, TypeScript, custom node `--test` runner (`apps/api/scripts/run-tests.mjs`) ; PWA vanilla JS ESM (`App/`), `node --test tests/*.test.mjs`.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the current priority docs list in `docs/plans/README.md`, after the latest existing entry, before the "Legacy docs" trailer:

```
- `2026-06-23-zwibba-profile-identity-design.md`
- `2026-06-23-zwibba-profile-identity-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "profile-identity" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index profile-identity plans"
```

---

### Task 2: Add the `User.displayName` column (additive migration)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260623120000_user_display_name/migration.sql`

**Step 1: Write the schema change and migration**

Add `displayName String?` to `model User` in `apps/api/prisma/schema.prisma` (nullable, no default, no other field touched). Create the migration SQL mirroring the existing additive style in `apps/api/prisma/migrations/20260405110000_user_profile_area/migration.sql`:

```sql
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
```

**Step 2: Verify the Prisma client regenerates**

Run: `pnpm -C apps/api prisma:generate`
Expected: completes with "Generated Prisma Client" and no error; `rg -n "displayName" apps/api/prisma/schema.prisma` shows the new field on `model User`.

**Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260623120000_user_display_name/migration.sql
git commit -m "feat: add User.displayName column"
```

---

### Task 3: Failing test — `getProfile` returns `displayName` and `memberSince`

**Files:**
- Modify: `apps/api/test/profile/profile.e2e-spec.ts`

**Step 1: Write the failing test**

Extend the in-memory Prisma fake in `apps/api/test/profile/profile.e2e-spec.ts` so its seeded users carry `createdAt` (a fixed Date) and `displayName` (null by default). Add a test asserting that `GET /profile` for a verified session returns `displayName` (null when unset) and `memberSince` equal to the seeded `createdAt` ISO string, alongside the existing `area` and `phoneNumber`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- profile`
Expected: FAIL because `getProfile` does not yet return `displayName` / `memberSince`.

**Step 3: Commit**

```bash
git add apps/api/test/profile/profile.e2e-spec.ts
git commit -m "test: expect profile response to include displayName and memberSince"
```

---

### Task 4: Implement `getProfile` identity fields

**Files:**
- Modify: `apps/api/src/profile/profile.service.ts`

**Step 1: Implement**

In `ProfileService.getProfile`, include `displayName: user.displayName ?? null` and `memberSince: user.createdAt` (returned as ISO/raw) in the returned object, keeping `area` and `phoneNumber`.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- profile`
Expected: PASS — the Task 3 assertions are green.

**Step 3: Commit**

```bash
git add apps/api/src/profile/profile.service.ts
git commit -m "feat: return displayName and memberSince from getProfile"
```

---

### Task 5: Failing test — display name validator

**Files:**
- Create: `apps/api/test/common/display-name.test.ts`

**Step 1: Write the failing test**

Add unit tests for a not-yet-existing `normalizeDisplayName` exported from `apps/api/src/common/display-name.ts`. Assert: trims whitespace; rejects empty/whitespace-only; rejects values longer than the max length; rejects reserved words (`zwibba`, `officiel`, `admin`, `support`, case-insensitive, including when embedded); rejects a small profanity blocklist; returns the cleaned value for a valid name.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- display-name`
Expected: FAIL because `apps/api/src/common/display-name.ts` does not exist.

**Step 3: Commit**

```bash
git add apps/api/test/common/display-name.test.ts
git commit -m "test: add display name validation rules"
```

---

### Task 6: Implement the display name validator

**Files:**
- Create: `apps/api/src/common/display-name.ts`

**Step 1: Implement**

Create `normalizeDisplayName(raw: string)` that trims, enforces min length 1 and a max length (e.g. 40), rejects reserved words and a profanity blocklist (throwing a `BadRequestException` with a clear FR message), and returns the cleaned string. Mirror the structure of the existing validators in `apps/api/src/common/`.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- display-name`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/common/display-name.ts
git commit -m "feat: add display name validator"
```

---

### Task 7: Failing test — `POST /profile/identity` persists displayName

**Files:**
- Modify: `apps/api/test/profile/profile.e2e-spec.ts`

**Step 1: Write the failing test**

Add tests asserting that `POST /profile/identity` with a valid `displayName` (a) requires a session (401 without), (b) persists the cleaned value and returns it via the profile shape, and (c) returns 400 for a reserved word such as `Zwibba Officiel`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- profile`
Expected: FAIL because the `/profile/identity` route does not exist yet.

**Step 3: Commit**

```bash
git add apps/api/test/profile/profile.e2e-spec.ts
git commit -m "test: expect profile identity endpoint to persist display name"
```

---

### Task 8: Implement the identity write endpoint

**Files:**
- Modify: `apps/api/src/profile/profile.controller.ts`
- Modify: `apps/api/src/profile/profile.service.ts`

**Step 1: Implement**

Add `POST identity` under `@Controller('profile')` guarded by `SessionAuthGuard`, delegating to a new `ProfileService.updateIdentity({ displayName, session })` that runs `normalizeDisplayName`, updates `user.displayName` by `phoneNumber`, and returns the same shape as `getProfile`.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- profile`
Expected: PASS — Task 7 assertions green.

**Step 3: Commit**

```bash
git add apps/api/src/profile/profile.controller.ts apps/api/src/profile/profile.service.ts
git commit -m "feat: add profile identity update endpoint"
```

---

### Task 9: Failing test — `buildSellerProfile` uses real identity, drops fabricated data

**Files:**
- Modify: `apps/api/test/listings/listings.e2e-spec.ts`

**Step 1: Write the failing test**

Extend the listing-detail test in `apps/api/test/listings/listings.e2e-spec.ts` to assert that `detail.seller` (a) uses the owner's `displayName` as `name` when the matching `User` has one, (b) falls back to a neutral label (e.g. `Vendeur Zwibba`) — never `Particulier <digits>` — when no `displayName`, (c) exposes a `sellerId` equal to the owner `User.id` when resolvable and `null` for an orphan listing whose `ownerPhoneNumber` matches no `User`, and (d) no longer contains a `responseTime` field.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- listings`
Expected: FAIL because `buildSellerProfile` still fabricates `name`/`responseTime` and exposes no `sellerId`.

**Step 3: Commit**

```bash
git add apps/api/test/listings/listings.e2e-spec.ts
git commit -m "test: expect seller block to use real identity without fabricated data"
```

---

### Task 10: Implement real seller identity in `buildSellerProfile`

**Files:**
- Modify: `apps/api/src/listings/listings.service.ts`

**Step 1: Implement**

Make `buildSellerProfile` asynchronous: resolve the owner `User` by `ownerPhoneNumber` via Prisma, set `name` to `displayName` or the neutral fallback, set `sellerId` to `user.id` or `null`, and remove `responseTime` from the returned object. Await it at its single call site (`listings.service.ts:312`); ensure the enclosing detail builder is async.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- listings`
Expected: PASS — Task 9 assertions green.

**Step 3: Commit**

```bash
git add apps/api/src/listings/listings.service.ts
git commit -m "refactor: derive seller block from real user identity"
```

---

### Task 11: Failing test — public seller endpoint

**Files:**
- Create: `apps/api/test/profile/seller-public.e2e-spec.ts`

**Step 1: Write the failing test**

Add tests for an unauthenticated `GET /sellers/:sellerId` asserting: returns `displayName` (or neutral fallback) and `memberSince`; returns only the seller's listings with `lifecycleStatus === 'active'` and `moderationStatus === 'approved'` (excluding paused/sold/deleted/pending/blocked and any draft/private data and the phone number); returns an empty `listings` array (200) for a seller with no active listings; returns 404 for an unknown id.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- seller-public`
Expected: FAIL because the `/sellers/:sellerId` route does not exist.

**Step 3: Commit**

```bash
git add apps/api/test/profile/seller-public.e2e-spec.ts
git commit -m "test: expect public seller endpoint to expose identity and active listings"
```

---

### Task 12: Implement the public seller endpoint

**Files:**
- Create: `apps/api/src/profile/sellers.controller.ts`
- Modify: `apps/api/src/profile/profile.service.ts`
- Modify: `apps/api/src/profile/profile.module.ts`

**Step 1: Implement**

Add `SellersController` with an unauthenticated `GET sellers/:sellerId`, delegating to a new `ProfileService.getPublicSeller(sellerId)` that resolves the `User` by `id` (404 via `NotFoundException` if absent), and loads listings filtered on `ownerPhoneNumber` + active + approved (reusing the existing listings query path / service). Return only public fields. Register the controller in `profile.module.ts` (importing the listings provider if needed).

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- seller-public`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/profile/sellers.controller.ts apps/api/src/profile/profile.service.ts apps/api/src/profile/profile.module.ts
git commit -m "feat: add public seller profile endpoint"
```

---

### Task 13: Failing test — seller monogram util

**Files:**
- Create: `tests/seller-monogram.test.mjs`

**Step 1: Write the failing test**

Add `node --test` cases for a not-yet-existing `sellerMonogram(name)` exported from `App/utils/seller-monogram.mjs`: returns up to two uppercase initials from a multi-word name, a single initial for a one-word name, and a stable neutral initial (e.g. `Z`) for empty/falsy input.

**Step 2: Run test to verify it fails**

Run: `node --test tests/seller-monogram.test.mjs`
Expected: FAIL because `App/utils/seller-monogram.mjs` does not exist.

**Step 3: Commit**

```bash
git add tests/seller-monogram.test.mjs
git commit -m "test: add seller monogram initials helper"
```

---

### Task 14: Implement the seller monogram util

**Files:**
- Create: `App/utils/seller-monogram.mjs`

**Step 1: Implement**

Create `sellerMonogram(name)` returning the initials per Task 13. Pure function, no DOM.

**Step 2: Run test to verify it passes**

Run: `node --test tests/seller-monogram.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/utils/seller-monogram.mjs
git commit -m "feat: add seller monogram helper"
```

---

### Task 15: Failing test — profile service identity + new read fields

**Files:**
- Modify: `tests/profile-service.test.mjs`

**Step 1: Write the failing test**

Extend `tests/profile-service.test.mjs`: assert `fetchProfile` surfaces `displayName` and `memberSince` from the response, and add a `saveIdentity({ displayName, session })` test asserting it POSTs to `/profile/identity` with the bearer header and returns the parsed body.

**Step 2: Run test to verify it fails**

Run: `node --test tests/profile-service.test.mjs`
Expected: FAIL because `saveIdentity` does not exist.

**Step 3: Commit**

```bash
git add tests/profile-service.test.mjs
git commit -m "test: expect profile service to support saveIdentity"
```

---

### Task 16: Implement `saveIdentity` in the profile service

**Files:**
- Modify: `App/services/profile-service.mjs`

**Step 1: Implement**

Add `saveIdentity({ displayName, session })` posting to `${apiBaseUrl}/profile/identity` with `sessionHeaders` and JSON body, mirroring `saveProfile`'s error handling.

**Step 2: Run test to verify it passes**

Run: `node --test tests/profile-service.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/services/profile-service.mjs
git commit -m "feat: add saveIdentity to profile service"
```

---

### Task 17: Failing test — profile screen identity card and logout control

**Files:**
- Modify: `tests/profile-screen.test.mjs`

**Step 1: Write the failing test**

Extend `tests/profile-screen.test.mjs` to assert that the verified `renderProfileScreen` output contains: a display-name input (`name="displayName"`), a monogram element, a "Membre depuis" label fed from `memberSince`, and a logout control carrying `data-action="logout"`. Pass `profile` with `displayName` and `memberSince` through the render props.

**Step 2: Run test to verify it fails**

Run: `node --test tests/profile-screen.test.mjs`
Expected: FAIL because the identity card and logout control are not rendered.

**Step 3: Commit**

```bash
git add tests/profile-screen.test.mjs
git commit -m "test: expect profile identity card and logout control"
```

---

### Task 18: Implement the profile identity card and logout button

**Files:**
- Modify: `App/features/profile/profile-screen.mjs`

**Step 1: Implement**

Render an identity card (display-name input bound to a `profile-identity` form, monogram via `sellerMonogram`, "Membre depuis" from `memberSince`) above the zone card, and a logout button with `data-action="logout"`. Keep the locked state unchanged and rendering light.

**Step 2: Run test to verify it passes**

Run: `node --test tests/profile-screen.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/features/profile/profile-screen.mjs
git commit -m "feat: render profile identity card and logout button"
```

---

### Task 19: Failing test — seller route parsing and renderable key

**Files:**
- Modify: `tests/app-buyer-routing.test.mjs`

**Step 1: Write the failing test**

Add assertions: `parseAppRoute('#seller/user_123')` deep-equals `{ sellerId: 'user_123', type: 'seller' }`; and for a not-yet-exported `getRenderableRouteKey` from `App/features/home/buyer-browse-controller.mjs`, that two different seller ids yield different keys (`seller:user_a` vs `seller:user_b`) while existing `listing`/`thread` behaviour is preserved.

**Step 2: Run test to verify it fails**

Run: `node --test tests/app-buyer-routing.test.mjs`
Expected: FAIL because the seller route and the exported `getRenderableRouteKey` do not exist.

**Step 3: Commit**

```bash
git add tests/app-buyer-routing.test.mjs
git commit -m "test: expect seller route parsing and renderable route key"
```

---

### Task 20: Implement seller route parsing and extract the renderable key

**Files:**
- Modify: `App/features/home/buyer-browse-controller.mjs`
- Modify: `App/app.js`

**Step 1: Implement**

In `buyer-browse-controller.mjs`, extend `parseAppRoute` to recognise `#seller/{id}` → `{ sellerId, type: 'seller' }`, and add an exported pure `getRenderableRouteKey(route)` covering `listing`, `thread`, and `seller` (`seller:${route.sellerId || ''}`), defaulting to `route.type`. In `App/app.js`, import and use this exported `getRenderableRouteKey`, removing the inline closure version.

**Step 2: Run test to verify it passes**

Run: `node --test tests/app-buyer-routing.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/features/home/buyer-browse-controller.mjs App/app.js
git commit -m "feat: parse seller route and share renderable route key"
```

---

### Task 21: Failing test — listing detail seller block links to public profile, no responseTime

**Files:**
- Modify: `tests/listing-detail-screen.test.mjs`

**Step 1: Write the failing test**

Extend `tests/listing-detail-screen.test.mjs`: when `detail.seller.sellerId` is set, the rendered seller block links to `#seller/{sellerId}`; when `sellerId` is null the block renders without a link; and the output never contains the seller `responseTime` text.

**Step 2: Run test to verify it fails**

Run: `node --test tests/listing-detail-screen.test.mjs`
Expected: FAIL because the seller block is not linked and still reflects the old contract.

**Step 3: Commit**

```bash
git add tests/listing-detail-screen.test.mjs
git commit -m "test: expect seller block to link to public profile without responseTime"
```

---

### Task 22: Implement the linked seller block

**Files:**
- Modify: `App/features/listings/listing-detail-screen.mjs`

**Step 1: Implement**

Update the seller block (around line 435) to wrap it in a link to `#seller/${sellerId}` when present (plain non-linked block otherwise), and remove the `responseTime` line.

**Step 2: Run test to verify it passes**

Run: `node --test tests/listing-detail-screen.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/features/listings/listing-detail-screen.mjs
git commit -m "feat: link listing seller block to public profile"
```

---

### Task 23: Failing test — public seller screen render

**Files:**
- Create: `tests/seller-public-screen.test.mjs`

**Step 1: Write the failing test**

Add `node --test` cases for a not-yet-existing `renderSellerPublicScreen` from `App/features/profile/seller-public-screen.mjs`: renders the name (or neutral fallback), the monogram, "Membre depuis", and a card per active listing; renders a clear empty state when `listings` is empty.

**Step 2: Run test to verify it fails**

Run: `node --test tests/seller-public-screen.test.mjs`
Expected: FAIL because the module does not exist.

**Step 3: Commit**

```bash
git add tests/seller-public-screen.test.mjs
git commit -m "test: add public seller screen render expectations"
```

---

### Task 24: Implement the public seller screen and wire it in the app

**Files:**
- Create: `App/features/profile/seller-public-screen.mjs`
- Modify: `App/app.js`

**Step 1: Implement**

Create `renderSellerPublicScreen({ seller, listings, state })` reusing the existing listing-card and monogram helpers, with an empty state. In `App/app.js`, add a `case 'seller'` in the render switch that loads the seller via the profile service (a new `fetchPublicSeller({ sellerId })` may be added to `App/services/profile-service.mjs` if needed) and renders the screen.

**Step 2: Run test to verify it passes**

Run: `node --test tests/seller-public-screen.test.mjs`
Expected: PASS.

**Step 3: Commit**

```bash
git add App/features/profile/seller-public-screen.mjs App/services/profile-service.mjs App/app.js
git commit -m "feat: add public seller profile screen"
```

---

### Task 25: Wire the logout action with full in-memory state reset

**Files:**
- Modify: `App/app.js`

**Step 1: Implement**

Add a `logout` action handler that calls `authService.clearSession()`, resets the in-memory authenticated state (`state.session = null` and the relevant controller caches such as `buyerBrowseController.state` and seller listings state), then sets `window.location.hash = '#auth-welcome'` and re-renders.

**Step 2: Verify the handler resets session and redirects**

Run: `rg -n "logout|clearSession\(\)|state.session = null|#auth-welcome" App/app.js`
Expected: a `logout` action handler that calls `clearSession()`, sets `state.session = null`, and redirects to `#auth-welcome`.

**Step 3: Commit**

```bash
git add App/app.js
git commit -m "feat: reset session state on logout"
```

---

### Task 26: Final cross-cutting verification

**Files:**
- None (verification only)

**Step 1: Run the full API and App suites plus the app build smoke**

Run: `pnpm -C apps/api test && node --test tests/*.test.mjs && npm run smoke:app`
Expected: all API tests PASS, all App tests PASS, and `smoke:app` builds `dist/` with the expected artifacts. No fabricated `responseTime` remains: `rg -n "Répond en moyenne" apps/api/src App` returns no matches.

**Step 2: Confirm no schema regressions**

Run: `git diff --stat codex/website-vitrine-backup..HEAD`
Expected: only the files touched by this plan changed; zero deletions outside intentional `responseTime` removal and the inline `getRenderableRouteKey` extraction.

**Step 3:** Skip the commit step for this task because no file was modified.
