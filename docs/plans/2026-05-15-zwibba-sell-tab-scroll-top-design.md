# Zwibba Sell Tab Scroll-To-Top Design

## Goal

Make the persistent `Vendre` tab behave as a reliable return-to-top action for the seller home screen.

## Chosen behavior

- Tapping `Vendre` from another tab navigates to `#sell` and lands at the top of the seller screen.
- Tapping `Vendre` again while already on `#sell` also returns to the top.
- Other navigations to `#sell` keep their current behavior and are not forced to reset scroll.

## Approach

Keep `Vendre` as the existing `#sell` route link, but mark it as a dedicated scroll-to-top trigger in the bottom nav. The app click handler will record a one-shot `sell` scroll reset intent when that specific tab is tapped. On the next render, `renderApp()` will skip restoring the preserved scroll for that one render and instead set both the inner app scroller and the page scroll to `0`.

## Why this approach

- It matches the user's mental model: the `Vendre` tab itself means “go back to the seller home, at the top.”
- It avoids overloading the hash router with a second anchor target.
- It preserves current scroll behavior for all other rerenders and return paths.

## Testing

- Assert that the rendered `Vendre` tab exposes the dedicated scroll-reset marker.
- Assert that a one-shot scroll reset overrides preserved scroll once and then clears itself.
