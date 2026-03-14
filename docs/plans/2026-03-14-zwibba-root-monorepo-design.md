# Zwibba Root Monorepo Design

> **Date:** 2026-03-14
> **Status:** Approved
> **Scope:** Architecture override making `zwibba-website` the active Zwibba monorepo

---

## 1. Decision

`/Users/pc/zwibba-website` becomes the active Zwibba product repository.

This overrides the earlier assumption that the real product monorepo lives in `/Users/pc/lubu-classifieds`. From this point forward, new implementation work for mobile, API, admin, and planning docs should land in `zwibba-website`.

The existing browser prototype in `/Users/pc/zwibba-website/App` remains important, but only as a UX reference and validation tool. It is not the production app runtime.

---

## 2. Repository Shape

Target structure:

```text
/Users/pc/zwibba-website
  App/                  -> browser prototype and UX reference
  apps/
    mobile/             -> real Flutter app
    api/                -> real NestJS backend
    admin/              -> real moderation/admin surface
  docs/
    plans/              -> active source-of-truth plans and architecture docs
  src/site/             -> current marketing website
  scripts/              -> shared scripts and build helpers
  tests/                -> website and prototype tests
  package.json
  pnpm-workspace.yaml
```

Rules:

- `App/` stays reviewable and can keep evolving for UX validation.
- `apps/mobile` becomes the real shipped product frontend.
- `apps/api` becomes the real backend.
- `apps/admin` stays minimal and only covers v1 moderation needs.
- The current marketing site remains at repo root for now.

---

## 3. Ownership Model

### `App/`

- Owns browser-first prototype screens
- Owns UX exploration, copy validation, and flow review
- Must not become the real backend or the real mobile app

### `apps/mobile`

- Owns the production Flutter application
- Ports validated flows from `App/`
- Connects to `apps/api` contracts incrementally

### `apps/api`

- Owns auth, drafts, uploads, AI draft generation, moderation, listings, chat, wallet, and boosts
- Exposes the minimum API contracts required for the mobile app

### `apps/admin`

- Owns the back-office moderation queue
- Starts as a minimal v1 surface for pending review and blocked listing cases

### Repo root

- Owns docs, scripts, workspace wiring, and CI
- Continues to build and serve the current marketing website

---

## 4. Source Of Truth Rules

The authoritative document hierarchy becomes:

1. `docs/plans/2026-03-14-zwibba-root-monorepo-design.md`
   - architecture override for this repo
2. `docs/plans/2026-03-14-zwibba-root-monorepo-implementation.md`
   - execution order for migrating and building the real monorepo here
3. `App/`
   - visual and UX reference for seller-first flows
4. Legacy files in `/Users/pc/lubu-classifieds`
   - reference only until their relevant content is copied or superseded here

Operational rule:

- If product scope, architecture, or sequencing changes, update the docs in `zwibba-website/docs/plans/` first.
- Do not treat `/Users/pc/lubu-classifieds` as the active implementation target after this override.

---

## 5. Migration Strategy

### Phase 0: Source-of-truth reset

- Create `docs/plans/` in this repo
- Record this architecture override
- Write a new implementation plan that executes in `zwibba-website`

### Phase 1: Monorepo scaffold

- Add `apps/mobile`
- Add `apps/api`
- Add `apps/admin`
- Add workspace wiring and root smoke scripts
- Keep `App/` and the marketing site working

### Phase 2: Seller-first product foundation

- Port the validated seller flow from `App/` into `apps/mobile`
- Stand up the minimal API contracts for OTP, drafts, uploads, AI draft fill, and moderation
- Add the minimal admin moderation queue

### Phase 3: Remaining v1 flows

- Success/share
- Browse/detail
- Chat
- Profile
- Wallet and one simple boost

---

## 6. Build And Test Model

### Browser prototype

- Verified through browser/manual review and lightweight Node tests

### Mobile

- Verified with Flutter widget and service tests

### API

- Verified with NestJS unit and e2e tests

### Admin

- Verified with minimal UI tests

### Root

- Verified with smoke checks confirming:
  - marketing site still builds
  - `App/` still builds
  - `apps/mobile`, `apps/api`, and `apps/admin` exist and can be bootstrapped

---

## 7. First Real Batch

The first implementation batch in this repo should do only this:

1. Establish `docs/plans/` as the active planning location.
2. Scaffold `apps/mobile`, `apps/api`, and `apps/admin`.
3. Add root workspace and smoke scripts.
4. Keep the current website and `App/` prototype functioning.

This deliberately avoids mixing real backend/mobile work with the prototype until the repo foundation is correct.
