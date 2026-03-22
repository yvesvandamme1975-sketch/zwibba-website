# Zwibba Browser Phone Shell Refresh Design

## Summary

Refresh the public `/App` browser shell so the phone preview feels like a real mobile device on desktop instead of a long landing-page column. The phone frame should stay capped to the viewport height, the app content should scroll inside the device, and the first visible screen should feel tighter and more intentional.

## Goals

- Keep the desktop beta feeling like a phone, not a stretched panel
- Move long-screen overflow into the phone shell itself
- Preserve the left-side marketing copy layout on desktop
- Keep mobile widths edge-to-edge without introducing an awkward inner desktop scrollbar

## UX Decisions

### Desktop shell

- Cap the phone frame height from the viewport instead of letting it grow with content
- Keep the outer frame visible at all times
- Make the scrollable surface the app content inside the shell
- Show a discreet internal vertical scrollbar with Zwibba styling

### Home screen

- Keep `Continuer mon brouillon` when a draft exists
- Tighten the first viewport so the seller card, search, and start of the listing feed are visible together
- Reduce excess top spacing on home and flow screens so the UI feels denser and more deliberate

### Mobile behavior

- Keep the small-screen experience edge-to-edge
- Do not trap the user inside a nested desktop-style scroll region on mobile
- Preserve the existing routes, copy, and core component structure

## Scope

### In scope

- Browser app shell sizing in `App/app.css`
- Home and flow spacing adjustments in `App/app.css`
- Minimal shell markup updates only if needed to support internal scrolling
- Regression tests for the new shell structure and spacing hooks

### Out of scope

- Content rewrite
- Route changes
- Gallery/media work
- API/backend changes

## Validation

- Desktop phone shell remains within viewport height
- Long screens scroll inside the phone shell
- Home still shows seller-first CTA and the beginning of the feed
- Mobile layout remains full-width without an inner desktop scrollbar
