# Zwibba Internal Beta Readiness Design

**Date:** 2026-03-27

**Goal**

Make Zwibba testable as a production-grade internal beta across the full live stack without switching from demo OTP to Twilio yet.

**Scope**

- Keep the current live stack:
  - `/App` as the browser beta client
  - Railway API
  - Railway admin
  - Railway Postgres
  - Cloudflare R2
- Keep OTP in `demo` mode for this phase.
- Finish the operational and testability work needed so the internal team can exercise the whole app repeatedly:
  - seller listing creation with real photos
  - buyer browse and listing detail
  - buyer-to-seller in-app messaging
  - seller inbox, wallet, boost, and profile
  - admin approve/block moderation
  - repeatable clean demo accounts
  - trustworthy end-to-end reporting

**Out of Scope**

- Twilio Verify cutover
- real payment or top-up flows
- app-store or Flutter parity work
- public launch hardening beyond what the internal beta needs

**Architecture**

The existing `browser-live` worktree remains the active implementation source of truth. `/App` stays the live browser client and continues talking directly to the Railway API with browser `fetch`, while the API remains the only source of truth for sessions, drafts, listings, chats, wallet ledger rows, boosts, and moderation decisions.

The next phase does not introduce new product architecture. It closes the gap between “the app works if we know the quirks” and “the internal team can run the whole marketplace repeatedly without manual cleanup or ambiguous failures”.

## 1. Internal Beta Boundary

The app is considered internal-beta ready when one tester can:

1. Start from a known clean demo seller identity.
2. Post a listing with real uploaded photos.
3. See that listing in live browse and detail.
4. Open buyer-to-seller chat and exchange messages both ways.
5. Use wallet and boost from real persisted state.
6. Inspect the seller profile and owned listings.
7. Moderate a pending listing from admin.
8. Repeat the same flow later without database cleanup by hand.

The beta remains internal because demo OTP is still used. That means the auth path is intentionally weaker than launch auth, but every other system should behave like the real product.

## 2. Resettable Demo Accounts

The main blocker for repeatable testing is not feature coverage anymore; it is state drift. Demo numbers accumulate listings, boosts, wallet debits, and chat history, which makes later test runs unreliable.

This phase introduces one resettable demo seller account and at least one clean buyer account. For the resettable seller:

- successful demo OTP verification should trigger a full cleanup of that test identity’s mutable data
- the wallet should be reseeded automatically after reset
- static seeded marketplace content owned by other users must remain intact
- the cleanup must be scoped to demo mode only

This gives the team one stable number to document and reuse in E2E, screenshots, and manual testing.

## 3. Reliable E2E Signal

The current seller photo flow works, but Playwright still reports `net::ERR_ABORTED` on presigned R2 `PUT` and verification requests even when uploads complete and images render. That makes the automation noisier than the real user outcome.

The product-side upload flow should stay as-is:

- request upload URL
- `PUT` to R2
- verify the public object URL

The E2E layer should instead judge the real outcome:

- upload slot was issued
- object URL is reachable
- review, success, and listing screens render the uploaded image

Known cross-origin presigned upload abort noise should not fail the test if those postconditions are satisfied. This keeps the real safety check while making automated reports match reality.

## 4. Operational Hardening for the Beta

This phase should also tighten the internal operational surface:

- env validation should explicitly cover the resettable demo-account contract
- the Railway runbook should include tester accounts, reset behavior, URLs, and smoke steps
- the app should remove or avoid any remaining trust-eroding copy where the flow is already live
- the final docs should describe known limits clearly, especially:
  - demo OTP is temporary
  - payments are still test-credit based
  - chat refresh is polling/live-refresh, not websocket real-time

This is not a new observability platform project. It is the minimum operational hygiene required so the internal team can test confidently and report real issues.

## 5. Acceptance and Release Criteria

The internal beta phase is complete when:

- the resettable seller account always starts from a clean wallet/listing/chat state
- canonical live E2E covers seller publish, buyer messaging, and moderation round-trip
- E2E failures reflect real user-facing breakage rather than instrumentation noise
- the Railway runbook and tester instructions are enough for another operator to run the beta without tribal knowledge
- the public beta URL feels like a real app, not a prototype with hidden setup steps

**Testing**

- API: add test-first coverage for demo reset behavior and wallet reseeding
- Browser/E2E: add canonical live Railway flows for seller, messaging, and moderation
- Docs/smoke: extend the Railway runbook and root smoke scripts where needed

