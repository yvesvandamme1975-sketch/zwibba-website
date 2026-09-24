# Zwibba Instagram Direct Design

**Date:** 2026-09-24

## Goal

Start sharing from the Instagram button in one gesture, as explicitly requested by Yves at 19:25.

## Problem

The Instagram button only displays export instructions. Its primary action must instead hand the listing URL to the native share sheet, without a title or text.

## Non-Goals

No change to WhatsApp, Facebook, TikTok, images, Open Graph, pricing or server routes. A browser handoff does not prove Instagram renders a preview or delivers a message.

## Existing System

The listing share controller prepares the branded image separately and exposes native link and image actions. Instagram and TikTok currently share an instructions-only branch. Image completion can overwrite the destination status.

## Recommended Architecture

1. Instagram invokes navigator.share({url}) synchronously, retaining the selected destination so optional image controls remain available.
2. Without native sharing, start clipboard write and open Instagram Direct during the click, then confirm clipboard completion. Failed copying exposes a selectable URL; blocked opening is reported honestly.
3. Image preparation continues without overwriting the Instagram action result. TikTok instructions keep their existing readiness behavior.
4. Verify exact payload, desktop fallback/failures, cancellation and adjacent destinations, then release through the existing PR/Railway workflow and intercept the payload in a production browser.
