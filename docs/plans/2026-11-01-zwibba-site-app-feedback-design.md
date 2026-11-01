# Zwibba Site/App Feedback Design

**Date:** 2026-11-01

## Goal
Correct confirmed defects from Xavier's 31 October message while preserving the separate Instagram intervention.

## Problem
Live cards omit currency and condition metadata; price filtering assumes the market currency. The rendered result count uses historical content. Dynamic listing pages contain no readable listing body without JavaScript. A listing from CD inherits a BE browsing badge. Default public social metadata uses SVG. Mobile cards waste space.

## Non-Goals
No catalogue mutation based on unverified photo classification, invented seller verification, exchange rates, new image provider, social publishing or client email. Broader product suggestions remain explicitly qualified in the intervention.

## Existing System
Vanilla PWA and static build with server-injected live feeds. Reuse current PNG social asset, templates, filters, country brand renderer and server tests.

## Recommended Architecture
1. Preserve the API currency on live cards, provide explicit USD price ranges alongside CDF, and derive available category/condition choices from actual cards.
2. Render the live count and a safe listing summary on the server. Keep the existing app redirect and direct web-app contact path.
3. Use the listing country for its brand, without changing the user's browse preference. Use the existing social PNG and compact mobile cards.
4. Validate the whole release diff and public deployment. Keep suggestions and unverified mobile observations distinct from fixes.
