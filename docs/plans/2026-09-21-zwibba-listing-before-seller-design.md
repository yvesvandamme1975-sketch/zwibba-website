# Zwibba Listing Before Seller Design
**Date:** 2026-09-21
## Goal
Apply the user correction: show the listing first, then its seller.
## Problem
The earlier contact-first arrangement put the seller and actions above the photo and description.
## Non-Goals
No styling, data, contact behavior or other route changes.
## Existing System
Pure listing-detail renderer on trunk d886340.
## Recommended Architecture
### 1. Content order
Title, price/location, media, description and attributes, seller, contact/owner actions, safety, optional review.
### 2. Verification
Update the existing order regression to match the latest instruction, run root tests/build/contracts, publish via PR and verify the actual open listing.
