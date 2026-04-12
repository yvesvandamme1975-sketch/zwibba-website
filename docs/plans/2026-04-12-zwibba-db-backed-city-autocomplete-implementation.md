# DB-Backed City Autocomplete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the profile zone dropdown with a DB-backed Congo city autocomplete, including immediate-use missing-city suggestions.

**Architecture:** Add a reusable `LocationOption` table plus a dedicated locations API module, seed the main Congo cities into the DB, then replace the profile zone select with an autocomplete input backed by live API data. Keep `User.area` as a string in this pass so drafts, listings, and publish flows stay compatible.

**Tech Stack:** Prisma, NestJS, vanilla JS browser app, Node test runner, Railway Postgres, existing profile/session flows.

---

### Task 1: Add DB Support For City Options

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/prisma/schema.prisma`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/prisma/migrations/<timestamp>_location_options/migration.sql`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/locations/location-normalization.ts`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/locations/location-normalization.test.ts`

**Step 1: Write the failing test**

```ts
test('normalizeLocationLabel collapses accents, case, and extra spaces', () => {
  assert.equal(normalizeLocationLabel('  Kinshása  '), 'kinshasa');
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- locations/location-normalization.test.ts
```

Expected: FAIL because the helper file does not exist yet.

**Step 3: Write minimal implementation**

- Add `LocationOption` model with:
  - `countryCode String`
  - `label String`
  - `normalizedLabel String`
  - `type String`
  - `status String`
  - `sourceType String`
- Add a uniqueness rule on `countryCode + type + normalizedLabel`
- Implement `normalizeLocationLabel()` to:
  - trim
  - collapse inner whitespace
  - lowercase
  - remove accents

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- locations/location-normalization.test.ts
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api exec prisma generate
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations apps/api/src/locations/location-normalization.ts apps/api/test/locations/location-normalization.test.ts
git commit -m "feat: add location option schema"
```

### Task 2: Seed Main Congo Cities Into The DB

**Files:**
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/locations/system-seeded-cities.ts`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/scripts/seed-location-options.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/package.json`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/locations/system-seeded-cities.test.ts`

**Step 1: Write the failing test**

```ts
test('system seeded cities include Lubumbashi and Kinshasa for CD', () => {
  assert.ok(definitions.some((city) => city.label === 'Lubumbashi'));
  assert.ok(definitions.some((city) => city.label === 'Kinshasa'));
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- locations/system-seeded-cities.test.ts
```

Expected: FAIL because the definitions file does not exist yet.

**Step 3: Write minimal implementation**

- Add Congo city definitions with `countryCode = 'CD'`, `type = 'city'`, `status = 'active'`, `sourceType = 'system_seed'`
- Add a re-runnable seed script that upserts by normalized label
- Add an npm script such as:

```json
"seed:locations": "tsx src/locations/seed-location-options.ts"
```

**Step 4: Run test and seed to verify it works**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- locations/system-seeded-cities.test.ts
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api run seed:locations
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api run seed:locations
```

Expected: PASS, and the second seed run is idempotent.

**Step 5: Commit**

```bash
git add apps/api/src/locations/system-seeded-cities.ts apps/api/scripts/seed-location-options.ts apps/api/package.json apps/api/test/locations/system-seeded-cities.test.ts
git commit -m "feat: seed Congo city options"
```

### Task 3: Expose Locations Through The API

**Files:**
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/locations/locations.controller.ts`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/locations/locations.service.ts`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/locations/locations.module.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/app.module.ts`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/locations/locations.e2e-spec.ts`

**Step 1: Write the failing test**

```ts
test('locations endpoints list seeded CD cities and create user suggestions without duplicates', async () => {
  // GET /locations/cities?countryCode=CD
  // POST /locations/suggestions
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- locations/locations.e2e-spec.ts
```

Expected: FAIL because the module and endpoints do not exist yet.

**Step 3: Write minimal implementation**

- `GET /locations/cities?countryCode=CD`
  - returns active city rows
- `POST /locations/suggestions`
  - normalizes the label
  - returns an existing matching row if present
  - otherwise creates a `user_suggested` active city
- Keep response shape small:

```ts
{
  id,
  countryCode,
  label,
  sourceType,
  type,
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- locations/locations.e2e-spec.ts
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api exec tsc --noEmit
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/locations apps/api/src/app.module.ts apps/api/test/locations/locations.e2e-spec.ts
git commit -m "feat: add locations API"
```

### Task 4: Switch Profile Validation From Static Areas To DB Cities

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/profile/profile.service.ts`
- Delete or stop using: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/profile/profile-areas.ts`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/profile/profile.e2e-spec.ts`

**Step 1: Write the failing test**

```ts
test('profile save accepts a seeded city and a newly suggested city', async () => {
  // POST /profile with Lubumbashi
  // POST /locations/suggestions with Kasumbalesa
  // POST /profile with Kasumbalesa
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- profile/profile.e2e-spec.ts
```

Expected: FAIL because profile validation still uses the static area list.

**Step 3: Write minimal implementation**

- Replace `isSupportedProfileArea()` validation with a DB lookup against active city options
- Keep `User.area` as a string
- Reject empty city values
- Reject unknown cities that were neither seeded nor suggested

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- profile/profile.e2e-spec.ts
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api exec tsc --noEmit
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/profile/profile.service.ts apps/api/test/profile/profile.e2e-spec.ts
git commit -m "feat: validate profile city against DB locations"
```

### Task 5: Add Browser Helpers For City Search

**Files:**
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/App/utils/location-search.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/location-search.test.mjs`

**Step 1: Write the failing test**

```js
test('location search prioritizes prefix matches and ignores accents/case', () => {
  const results = getMatchingLocationSuggestions('l', ['Lubumbashi', 'Likasi', 'Kolwezi']);
  assert.deepEqual(results, ['Likasi', 'Lubumbashi']);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/location-search.test.mjs
```

Expected: FAIL because the helper does not exist yet.

**Step 3: Write minimal implementation**

- Add helpers to:
  - normalize labels
  - match by prefix first, then substring
  - remove duplicates
  - cap suggestions to a small list such as 6-8 items

**Step 4: Run test to verify it passes**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/location-search.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add App/utils/location-search.mjs tests/location-search.test.mjs
git commit -m "feat: add city autocomplete helper"
```

### Task 6: Fetch DB Cities In The Browser Profile Service

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/services/profile-service.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/profile-service.test.mjs`

**Step 1: Write the failing test**

```js
test('profile service lists Congo city options and can suggest a missing city', async () => {
  // expect GET /locations/cities?countryCode=CD
  // expect POST /locations/suggestions
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-service.test.mjs
```

Expected: FAIL because the browser service only supports `fetchProfile()` and `saveProfile()`.

**Step 3: Write minimal implementation**

- Add:
  - `listCities({ countryCode })`
  - `suggestCity({ countryCode, label })`
- Keep the existing `fetchProfile()` and `saveProfile()` unchanged

**Step 4: Run test to verify it passes**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-service.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add App/services/profile-service.mjs tests/profile-service.test.mjs
git commit -m "feat: add browser location service calls"
```

### Task 7: Replace The Profile Zone Select With Autocomplete UI

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/profile/profile-screen.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/app.css`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/profile-screen.test.mjs`

**Step 1: Write the failing test**

```js
test('profile screen renders a zone search input with live suggestions and a missing-city action', () => {
  const html = renderProfileScreen({
    citySuggestions: ['Lubumbashi', 'Likasi'],
    profileAreaInput: 'L',
    showCreateCityAction: true,
  });
  assert.match(html, /name="areaSearch"/);
  assert.match(html, /Lubumbashi/);
  assert.match(html, /Likasi/);
  assert.match(html, /Ville absente \? Utiliser/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-screen.test.mjs
```

Expected: FAIL because the UI still renders a `<select>`.

**Step 3: Write minimal implementation**

- Replace the zone select with:
  - search input
  - suggestions list
  - “missing city” action row
- Style it to fit the current mobile profile card

**Step 4: Run test to verify it passes**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-screen.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add App/features/profile/profile-screen.mjs App/app.css tests/profile-screen.test.mjs
git commit -m "feat: render profile city autocomplete"
```

### Task 8: Wire Autocomplete State And Missing-City Flow In The App

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/app.js`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/profile-area-sync.test.mjs`
- Test: `/Users/pc/zwibba-website-worktrees/browser-live/tests/profile-screen.test.mjs`

**Step 1: Write the failing test**

```js
test('profile flow lets the seller suggest a missing city and save it immediately', async () => {
  // load cities
  // type unknown city
  // create suggestion
  // save profile with that city
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-screen.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-area-sync.test.mjs
```

Expected: FAIL because app state does not yet track input text, suggestions, or missing-city creation.

**Step 3: Write minimal implementation**

- Add profile-city state to `app.js`:
  - loaded city list
  - current input text
  - selected city
  - suggestion results
- Load cities when profile becomes active
- Update suggestions on input
- When the seller chooses “Ville absente ? Utiliser ...”:
  - call `suggestCity()`
  - set the returned label as the selected city
- Save profile using the selected city label as `area`

**Step 4: Run test to verify it passes**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-screen.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-area-sync.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-service.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add App/app.js tests/profile-screen.test.mjs tests/profile-area-sync.test.mjs tests/profile-service.test.mjs
git commit -m "feat: wire DB-backed city autocomplete"
```

### Task 9: Full Verification And Live Seed Readiness

**Files:**
- Modify if needed: `/Users/pc/zwibba-website-worktrees/browser-live/docs/plans/README.md`

**Step 1: Run the full focused test suite**

Run:

```bash
node --test /Users/pc/zwibba-website-worktrees/browser-live/tests/location-search.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-screen.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-service.test.mjs /Users/pc/zwibba-website-worktrees/browser-live/tests/profile-area-sync.test.mjs
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- locations/locations.e2e-spec.ts
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api test -- profile/profile.e2e-spec.ts
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api exec tsc --noEmit
npm -C /Users/pc/zwibba-website-worktrees/browser-live run smoke:app
```

Expected: PASS.

**Step 2: Run the DB seed locally**

Run:

```bash
pnpm -C /Users/pc/zwibba-website-worktrees/browser-live/apps/api run seed:locations
```

Expected: seeded Congo cities exist and duplicate rows are not created.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: finalize city autocomplete plan references"
```

