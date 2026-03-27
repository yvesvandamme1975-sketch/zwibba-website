# Zwibba Browser Shell Scroll Fix Design

**Date:** 2026-03-27

**Goal**

Restore correct scrolling in the public `/App` shell so mobile behaves like a normal full-page app and desktop behaves like an app inside a phone with internal scrolling.

**Scope**

- Fix shell scrolling only.
- Keep the current routes, features, copy, and API behavior intact.
- Preserve the desktop phone-frame presentation.
- Preserve the mobile app-first presentation with the intro block hidden.

**Architecture**

The fix should not introduce a second app layout. It should split shell behavior by breakpoint:

- On desktop/tablet, keep the phone frame and make the app content scroll inside the frame.
- On mobile, remove the phone viewport behavior and let the page scroll normally.

The current regression comes from the shell using the wrong height ownership. The visible viewport is capped, but the inner tab content is still allowed to expand to the full content height, so there is no real inner scroll area on desktop. On mobile, the same inner-shell model makes the app feel trapped when it should just become a normal page.

## 1. Desktop Behavior

Desktop should continue to feel like “the app inside a phone”:

- the outer page remains mostly fixed
- the intro note stays beside the device
- the phone frame stays within the viewport
- long content scrolls inside the phone only

To achieve that, the shell hierarchy must give height ownership to the device:

- the phone shell gets the capped height
- the viewport inherits that height
- the tab shell fills that height
- the tab content becomes the single scroll container

## 2. Mobile Behavior

Mobile should stop pretending there is a desktop-style device frame:

- the intro note stays hidden
- the page should show only the app content
- the browser page should scroll normally
- no inner trapped scroll region should remain

This means the mobile breakpoint should release the phone constraints:

- no capped shell height
- no hidden overflow on the shell or viewport
- no dedicated inner scroll ownership on the tab content

## 3. Testing

The change should be verified at three levels:

- CSS/build tests for the breakpoint behavior
- local browser checks for:
  - desktop inner phone scroll
  - mobile page scroll
- live Railway browser check against `/App`

Success criteria:

- desktop wheel or trackpad scroll moves the content inside the phone frame
- mobile page scroll moves the app naturally
- no double-scroll behavior appears on desktop
- no route or layout regressions are introduced

