# Zwibba Browser Live Seller Flow Design

**Date:** 2026-03-18

**Goal**

Connect `/Users/pc/zwibba-website/App` to the live Railway API for the seller flow only, while keeping the current green browser prototype UI and route structure intact.

**Scope**

- Keep the existing browser screens and copy in `App/`.
- Replace local-only seller services with real API-backed behavior for:
  - OTP request and verification
  - signed media upload URL creation
  - direct browser upload to Cloudflare R2
  - draft sync
  - publish
  - success state listing link
- Keep buyer browse, chat, wallet, and boost in prototype mode for now.
- Keep demo OTP enabled on the live API for beta testing.

**Architecture**

`App/` stays a static browser frontend served from the website service. It will use a configurable API base URL, persist seller session plus local draft metadata in `localStorage`, and call the live API with `fetch`. Photos upload directly from the browser to Cloudflare R2 using signed `PUT` URLs returned by the API.

**Data Flow**

1. Seller chooses a demo capture card in `#capture`.
2. The app keeps the current local AI/draft enrichment flow, but the resulting draft becomes upload-aware.
3. OTP request and verify move from local mocks to the live `/auth` endpoints.
4. After OTP verification, the browser stores the returned session token and includes it on seller API requests.
5. On final publish:
   - ensure the draft photos have live uploaded objects
   - sync the draft to the API
   - publish through the live moderation endpoint
   - route to success/pending/blocked using the real response

**Error Handling**

- Keep the current inline French UX.
- Show server errors near the existing phone, OTP, review, and publish actions.
- Keep local draft data even if upload or publish fails so the seller can retry.

**Testing**

- Add test-first coverage for live auth persistence, signed upload handling, draft sync, and publish routing.
- Keep the current browser build tests green.
- Smoke the deployed website route after release.
