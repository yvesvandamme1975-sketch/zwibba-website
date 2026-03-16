# Zwibba Productionization Design

> **Date:** 2026-03-16
> **Status:** Approved
> **Scope:** Productionize the current Zwibba flows in `/Users/pc/zwibba-website`

---

## 1. Decision

Zwibba will productionize the existing seller, buyer, chat, wallet, boost, and moderation flows inside `/Users/pc/zwibba-website` instead of adding new product scope first.

The current repo already has the right monorepo shape and the right UX structure, but its backend behavior is still demo-grade. The next phase replaces in-memory state and placeholder provider behavior with real production infrastructure.

This phase locks the initial provider stack to:

- **Hosting and database:** Railway + Railway Postgres
- **Media storage:** Cloudflare R2
- **OTP/SMS:** Twilio Verify

---

## 2. Goals

### Primary goal

Make the current flows restart-safe, deployable, and operationally real:

- seller OTP and sessions
- draft persistence
- photo upload
- publish and moderation
- listings feed and listing detail
- chat
- wallet
- one simple boost flow

### Non-goals

This phase does **not** add new product scope such as:

- payments checkout
- advanced analytics dashboards
- recommendation engines
- web buyer app rewrite
- multi-admin roles and permissions
- native push notifications

---

## 3. Current Gaps

The current monorepo is structurally correct but not production-ready:

- `apps/api` uses in-memory maps as the source of truth
- OTP uses deterministic fake codes instead of a provider
- draft and listing state disappears on restart
- media uploads are not real
- admin is testable but not yet deployable as a real moderation surface
- wallet, boost, chat, and listings still depend on fixture-style behavior

That means the current stack is good for product validation, not for launch.

---

## 4. Production Architecture

### `apps/api`

`apps/api` becomes the canonical system of record.

Responsibilities:

- validate configuration and environment at boot
- persist data in Railway Postgres
- issue and validate Zwibba sessions
- request and verify OTP through Twilio Verify
- generate Cloudflare R2 presigned upload URLs
- persist drafts, listings, moderation decisions, chats, wallet ledger rows, and boost rows

### `apps/mobile`

`apps/mobile` remains the production client.

Responsibilities:

- call the real API contracts
- store the active session securely on-device
- capture or select real photos
- upload directly to R2 using presigned URLs
- resume unfinished drafts after restart
- render the same seller-first UX with production data underneath

### `apps/admin`

`apps/admin` stays intentionally small but must become operational.

Responsibilities:

- render the pending moderation queue from real API data
- expose the current moderation state clearly
- be deployable as a Railway service
- use environment-based access protection for the first production version

### Repo root

The current marketing website and `/App` browser prototype remain in the repo, but they do not become the source of truth for production runtime state.

---

## 5. Provider Strategy

### Railway Postgres

- single production database for API domain state
- separate local/test database URL for development and CI
- `DATABASE_URL` becomes mandatory for API startup

### Cloudflare R2

- media uploads use S3-compatible presigned `PUT` URLs
- API stores metadata and object keys, not file bytes
- mobile uploads files directly to R2
- no local disk persistence on Railway

### Twilio Verify

- OTP send and verify are delegated to Twilio Verify
- Zwibba still owns the app session lifecycle in Postgres
- Twilio credentials are API-only secrets

Operational requirement:

- verify Twilio Verify deliverability and geo-permissions for DRC numbers before launch

---

## 6. Data Model Direction

The first production schema should cover these tables or their equivalent:

- `User`
- `Session`
- `Draft`
- `DraftPhoto`
- `Listing`
- `ModerationDecision`
- `ChatThread`
- `ChatMessage`
- `WalletTransaction`
- `BoostPurchase`

Design rules:

- all productionized state must survive restart
- every media object key must map to a database record
- every moderation action must be auditable
- every wallet change must be ledger-backed

---

## 7. Security and Access Rules

### Mobile sessions

- OTP-verified sessions are required for seller actions that persist data
- sessions are stored in secure device storage
- bearer-token style API access is acceptable for v1

### Buyer-facing behavior

- browse and listing detail can remain public
- contact, chat continuity, wallet, and boost should use a persisted Zwibba session

### Admin

- first production admin deployment uses environment-configured access protection
- no public anonymous moderation surface

### Secrets

- Twilio and R2 secrets live only on the API service
- Flutter receives no provider secrets

---

## 8. Execution Order

### Phase A: Platform foundation

- Prisma setup
- Railway-friendly boot config
- Postgres health checks
- environment validation

### Phase B: Auth and sessions

- Twilio Verify integration
- persistent user/session records
- mobile secure session restore

### Phase C: Media and drafts

- R2 presigned upload flow
- persistent draft and photo records
- restart-safe draft recovery

### Phase D: Publish and moderation

- DB-backed publish transaction
- moderation decision persistence
- deployable admin queue

### Phase E: Remaining persisted flows

- DB-backed listings
- DB-backed chat
- DB-backed wallet and boost

### Phase F: Railway deployment and smoke checks

- service build/start commands
- env examples
- deployment runbook
- production smoke checks

---

## 9. Release Gates

Productionization is complete only when all of the following are true:

- no in-memory canonical state remains for productionized flows
- API restart does not lose users, sessions, drafts, listings, chat, wallet, boost, or moderation state
- mobile seller flow works against live API plus R2 plus Twilio test path
- admin queue renders real pending items from the database
- Railway deployment can be reproduced from docs and repo config alone

---

## 10. Source Of Truth Update

The active productionization document order becomes:

1. `docs/plans/2026-03-14-zwibba-root-monorepo-design.md`
2. `docs/plans/2026-03-16-zwibba-productionization-design.md`
3. `docs/plans/2026-03-16-zwibba-productionization-implementation.md`

The earlier phase plans remain valuable reference for how the current app was assembled, but the next execution phase should follow the productionization plan below.
