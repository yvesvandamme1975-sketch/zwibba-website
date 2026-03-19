# Zwibba Browser Live Buyer Flow Design

**Date:** 2026-03-19

**Goal**

Wire the buyer side of `/Users/pc/zwibba-website-worktrees/browser-live/App` to the live Railway API so the public beta feels like one real in-app marketplace, not only a seller posting flow.

**Scope**

- Keep the existing green browser shell and seller-first top block on `#home`.
- Replace static buyer feed data on home with live data from `GET /listings`.
- Add live search and live category filtering in the home feed area.
- Add an in-app buyer detail route for `#listing/<slug>`.
- Keep seller posting behavior unchanged.
- Keep chat, wallet, and boost out of scope for this pass.

**Architecture**

`/App` remains one static browser frontend. It will load the buyer feed from the live API once on boot, hold search text plus selected category in browser state, and filter the live feed locally for speed. Listing detail will load from `GET /listings/:slug` and render inside the same hash-routed app shell.

**Route Design**

- `#home`
  - seller card remains at the top
  - search and category chips become interactive
  - featured and recent sections are derived from the live feed
- `#listing/<slug>`
  - new in-app buyer detail screen
  - back action returns to the current home state

**Data Flow**

1. App boot loads the live listings feed from the Railway API.
2. Search text filters by listing title, category label, and location label.
3. Category chips filter by `categoryId`.
4. Clicking a listing card routes to `#listing/<slug>`.
5. The detail route loads the live listing detail payload and renders title, price, location, seller info, safety tips, and contact actions.

**Contact Actions**

- WhatsApp: open a composed `wa.me` link using the listing title and current public listing URL.
- SMS: open an `sms:` action with a prefilled buyer message.
- Call: open a `tel:` action using the public seller contact placeholder label already implied by the API.

This pass is UX-complete enough for beta while avoiding backend expansion beyond the existing listings endpoints.

**Error Handling**

- Home feed:
  - loading state while listings load
  - empty state when filters return no results
  - retry state when the live feed fails
- Detail:
  - loading state while detail loads
  - clean not-found/error state if a slug fails

**Testing**

- Add test-first coverage for:
  - live listings feed client
  - home filtering behavior
  - hash route parsing for `#listing/<slug>`
  - live detail rendering
- Finish with a real browser smoke against the public `/App` Railway URL.
