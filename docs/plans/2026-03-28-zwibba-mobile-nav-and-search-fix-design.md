# Zwibba Mobile Nav and Search Fix Design

## Summary

Make the browser beta app feel stable on mobile by fixing two shell-level UX bugs:

- the bottom navigation must stay pinned to the viewport bottom on mobile
- the buyer search input must support continuous typing instead of effectively accepting one character per focus cycle

Desktop keeps the current in-phone layout and inner scrolling model.

## Goals

- Keep the bottom navigation always visible on mobile
- Reserve enough bottom space so content never hides behind the nav
- Preserve the existing desktop shell behavior
- Keep buyer search live-filtering while preserving focus and caret position across rerenders

## Non-Goals

- No route changes
- No API changes
- No redesign of tab labels or buyer filtering logic
- No desktop shell rewrite

## Design

### Mobile navigation

On `max-width: 640px`, the tab nav becomes a viewport-fixed bar:

- `position: fixed`
- `left: 0`
- `right: 0`
- `bottom: 0`
- safe-area-aware bottom padding

The content area gets reserved bottom space using a shared nav-height variable so forms, lists, and buttons remain reachable above the fixed nav.

### Desktop behavior

Desktop and tablet keep the current shell:

- phone frame remains the visible app container
- content scrolls inside the phone
- tab nav remains in normal shell flow

### Buyer search stability

The app currently rerenders on every buyer search keystroke. That is acceptable for beta-scale data, but it must preserve:

- input focus
- selection start
- selection end

The fix is to capture buyer-search focus state immediately before rerender and restore it immediately after rerender when the active route is still `buy`.

## Testing

- CSS shell test for mobile fixed nav and reserved content space
- unit test for buyer-search focus/caret preservation helper
- smoke test to ensure app build output still succeeds

## Rollout

- deploy website service only
- verify on live mobile viewport that nav stays pinned while content scrolls
- verify buyer search accepts continuous typing and still filters live
