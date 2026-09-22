# Zwibba Select Contrast Design
**Date:** 2026-09-22
## Goal
Keep native dropdown options readable in the dark interface.
## Problem
The supplied rating-menu screenshot shows near-white option text on a white native popup.
## Non-Goals
No custom select component, review submission changes, or listing reordering.
## Existing System
The shared stylesheet sets dark color-scheme on the root and light text on selects, but no explicit option background.
## Recommended Architecture
### 1. Shared native control colors
Declare dark color-scheme on selects and opaque background/text tokens on options and option groups. Preserve native keyboard navigation and selected-state rendering.
