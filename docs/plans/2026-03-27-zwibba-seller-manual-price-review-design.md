# Zwibba Seller Manual Price Review Design

**Date:** 2026-03-27

**Goal**

Keep the seller fully in control of the final listing price and make the seller review screen image-first instead of exposing raw photo URLs.

**Scope**

- Remove AI price guidance from the seller review UI.
- Keep the final seller price field fully manual and required.
- Keep AI limited to category and content assistance already present in the draft flow.
- Make `Photo principale` render as media or a visual fallback, never as a visible URL string.
- Keep the change browser-app only; no API or AI service contract changes.

**Pricing Behavior**

The seller review screen should not display `Fourchette IA`, `Prix suggéré`, or any AI-derived price messaging. The only pricing control in the seller review flow is the manual `Prix final (CDF)` field. Validation remains unchanged: publish still requires the seller to choose a final price before continuing.

AI price data may still exist internally on the draft model for now, but the browser seller UI must ignore it entirely. This keeps scope tight and avoids broadening the AI contract change into this pass.

**Photo Principale Behavior**

The seller review screen should always present the primary photo visually:

- if a valid `publicUrl`, `previewUrl`, or local object URL exists, render an `<img>`
- if no image source exists, render a visual fallback tile with a short message such as `Aperçu indisponible`
- the photo metadata list should show human-readable status text, not the raw image URL

This keeps the seller review screen aligned with the rest of the product, which is now media-first.

**Testing**

- review screen no longer renders AI price guidance
- manual price field still renders and validation still requires it
- review screen renders a hero `<img>` when a primary photo source exists
- review screen does not expose the raw photo URL as visible body text
- review screen renders a visual fallback when no primary photo source exists
