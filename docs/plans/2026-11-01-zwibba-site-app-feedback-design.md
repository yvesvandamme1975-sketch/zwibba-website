# Zwibba Site/App Feedback Design

**Date:** 2026-11-01

## Goal
Correct confirmed defects from Xavier's 31 October message while preserving the separate Instagram intervention.

## Problem
Live cards omit currency and condition metadata; price filtering assumes the market currency. The rendered result count uses historical content. Dynamic listing pages contain no readable listing body without JavaScript. A listing from CD inherits a BE browsing badge. Default public social metadata uses SVG. Mobile cards waste space.

## Non-Goals
No catalogue mutation based on unverified photo classification, invented seller verification, exchange rates, new image provider, social publishing or client email. Existing seller data remains factual; missing identity/phone proof is reported explicitly.

## Existing System
Vanilla PWA and static build with server-injected live feeds. Reuse current PNG social asset, templates, filters, country brand renderer and server tests.

## Recommended Architecture
1. Preserve the API currency on live cards, provide explicit USD price ranges alongside CDF, and derive available category/condition choices from actual cards.
2. Render the live count and a safe listing summary on the server. Keep the existing app redirect and direct web-app contact path.
3. Use the listing country for its brand, without changing the user's browse preference. Use the existing social PNG and compact mobile cards.
4. Scope clarified by the owner mandate: complete the contact hierarchy, compact navigation, shared logo, actual seller dates and WebP thumbnails using installed sharp. Review eligibility requires an actual buyer message in the listing thread, as explicitly chosen by Yves on 1 November; enforce it on both detail and submit endpoints. Add a locality selector from published location labels.
5. Validate the whole release diff and public deployment. Keep suggestions and unverified mobile observations distinct from fixes.
