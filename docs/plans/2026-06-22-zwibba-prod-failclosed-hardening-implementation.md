# Zwibba Production Fail-Closed Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Faire fail-closer les trois services en production Railway meme sans NODE_ENV, en re-keyant sur RAILWAY_ENVIRONMENT, et rejeter le secret admin public par defaut en production.

**Architecture:** resolveApiBaseUrl (website) et isProductionEnv (apps/api) traitent RAILWAY_ENVIRONMENT===production comme production ; loadAdminEnv (apps/admin) devient production-aware et exige un ZWIBBA_ADMIN_SHARED_SECRET non-defaut en production.

**Tech Stack:** Node ESM (website, node --test), NestJS/TypeScript apps/api + apps/admin (node:test via scripts/run-tests.mjs, tsx).

---

### Task 1: Index the new planning docs

**Files:** Modify `docs/plans/README.md`

Append the two filenames after the latest entry, before the Legacy trailer. Verify with `grep -n prod-failclosed-hardening docs/plans/README.md`. Commit `docs: index prod-failclosed-hardening plans`.

### Task 2: Website resolver honours RAILWAY_ENVIRONMENT (failing test)

**Files:** Modify `tests/api-base-url.test.mjs`

Add a test: `resolveApiBaseUrl({ RAILWAY_ENVIRONMENT: production })` throws `/ZWIBBA_API_BASE_URL/`. Run `node --test tests/api-base-url.test.mjs` -> FAIL (dev default returned, no throw). Commit `test: cover railway-environment fail-closed for website api base url`.

### Task 3: Implement the website re-key

**Files:** Modify `shared/api-base-url.mjs`

Change the production check to `env.NODE_ENV === production || env.RAILWAY_ENVIRONMENT === production`. Run `node --test tests/api-base-url.test.mjs` -> PASS. Commit `feat: fail closed on railway production for website api base url`.

### Task 4: apps/api isProductionEnv honours RAILWAY_ENVIRONMENT (failing test)

**Files:** Modify `apps/api/test/config/env.test.ts`

Add a test asserting that with `RAILWAY_ENVIRONMENT: production` and a missing required value (e.g. omit APP_BASE_URL), `loadEnv` throws `/Missing required env value/`. Run `pnpm -C apps/api test config` -> FAIL (default still applied because NODE_ENV not production). Commit `test: treat railway production as production in api env`.

### Task 5: Implement the apps/api re-key

**Files:** Modify `apps/api/src/config/env.ts`

`isProductionEnv` returns true when `(source.NODE_ENV ?? default).trim() === production` OR `source.RAILWAY_ENVIRONMENT?.trim() === production`. Run `pnpm -C apps/api test config` -> PASS. Commit `feat: treat railway production as production in api env`.

### Task 6: apps/admin rejects the default secret in production (failing test)

**Files:** Create `apps/admin/test/config/env.test.ts`

Add tests: (a) with `RAILWAY_ENVIRONMENT: production` and no `ZWIBBA_ADMIN_SHARED_SECRET`, `loadAdminEnv` throws; (b) with `RAILWAY_ENVIRONMENT: production` and `ZWIBBA_ADMIN_SHARED_SECRET: zwibba-admin-secret` (the public default), `loadAdminEnv` throws `/insecure default/`; (c) with a real secret in production, returns it; (d) outside production, the convenience default is still allowed. Run `pnpm -C apps/admin test env` -> FAIL (module has no production concept). Commit `test: fail closed on default admin secret in production`.

### Task 7: Implement the apps/admin fail-closed secret

**Files:** Modify `apps/admin/src/config/env.ts`

Add `isProductionEnv(source)` = `NODE_ENV===production || RAILWAY_ENVIRONMENT===production`. In production: `ZWIBBA_ADMIN_SHARED_SECRET` must be present (no default fallback) and must not equal `zwibba-admin-secret`, else throw an explicit error. Outside production keep current behaviour. Run `pnpm -C apps/admin test env` -> PASS. Commit `feat: fail closed on default admin secret in production`.

### Task 8: Cross-cutting verification

Run the three suites: `npm test` (root), `pnpm -C apps/api test`, `pnpm -C apps/admin test`. All green. Skip the commit step for this task because no file is modified.
