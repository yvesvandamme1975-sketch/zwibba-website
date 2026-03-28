# Zwibba In-App Message Notifications Design

## Summary

Zwibba should notify users inside `/App` when a new message arrives. The first version should stay fully in-app:

- a badge on the bottom `Messages` tab
- unread emphasis on inbox cards
- unread counts based on real backend chat state

This pass does not add browser push notifications, email, or SMS alerts.

## Scope

- Add unread message tracking to persisted chat threads
- Show total unread count on the bottom `Messages` tab
- Show unread styling and counts in the inbox list
- Clear unread state when the user opens a thread
- Keep the currently open thread from accumulating unread notifications
- Update badge counts while the user is on other app tabs

Out of scope:

- browser push notifications
- native push
- toast-only notification systems
- external notification channels

## Current Issue

The browser app already renders `unreadCount` in the inbox UI, but the API currently hardcodes `unreadCount: 0` for every thread. The app also only polls inbox data while the user is on `#messages`, so a user on `#sell`, `#buy`, `#wallet`, or `#profile` will not see any in-app message signal until they open Messages themselves.

## Design

### Backend unread source of truth

Unread state should live in `ChatThread`, not in a separate notification system.

Add two per-thread read markers:

- `buyerLastReadAt`
- `sellerLastReadAt`

Unread count is derived from persisted messages:

- seller unread = buyer messages created after `sellerLastReadAt`
- buyer unread = seller messages created after `buyerLastReadAt`

This keeps unread logic durable, session-independent, and easy to recompute.

### Thread behavior

- Opening a thread marks it read for the current viewer.
- Sending a message should also update the sender’s own `lastReadAt`.
- If the user is already on the open thread, incoming messages should append live but should not create unread notification state for that same viewer.

### Browser notification surfaces

#### Bottom tab badge

- The `Messages` tab gets a badge when total unread count is greater than zero.
- The badge should stay visible across all app tabs until the relevant thread is opened/read.
- If the unread total is large, the badge can clamp to `99+`.

#### Inbox cards

- Unread threads get stronger visual emphasis:
  - stronger border/background treatment
  - visible unread badge or `Nouveau` marker
  - existing unread count text remains

### Live refresh behavior

- If the user is on an open thread, keep polling that thread.
- On all other app routes, poll inbox state so the badge can update while the user is elsewhere in the app.
- This reuses the existing polling controller rather than adding a second notification channel.

## Testing

- API tests:
  - inbox returns unread count for seller and buyer correctly
  - fetching a thread clears unread count for that viewer
  - sending a message does not create unread state for the sender
- Browser tests:
  - tab shell renders unread badge on the `Messages` tab
  - inbox card renders unread styling and count
  - polling controller refreshes inbox on non-thread routes
  - thread route continues polling the open thread only

## Notes

- This is the correct beta scope: persistent and visible, but not noisy.
- The unread badge should be treated as real product state, not just UI decoration.
