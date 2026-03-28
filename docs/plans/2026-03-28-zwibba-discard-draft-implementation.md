# Zwibba Draft Discard Implementation

## Scope

1. Add seller-side `Abandonner mon brouillon` CTAs.
2. Add browser delete service support.
3. Add API draft delete endpoint with R2 object cleanup.
4. Make queued uploads cancellable enough for draft reset.
5. Cover the flow with browser and API tests.

## Verification

- `node --test tests/app-home.test.mjs tests/post-flow.test.mjs tests/app-live-api.test.mjs tests/upload-task-queue.test.mjs`
- `pnpm -C apps/api test -- drafts-persistence`
- `pnpm -C apps/api exec tsc --noEmit`
- `npm run smoke:app`

## Deploy

- deploy `api`
- deploy `website`
- verify a live draft can be created, abandoned, and removed from the seller home state
