# Zwibba Impeccable UI Reliability Design

**Date:** 2026-09-08

## Goal

Audit the public website and PWA with Impeccable, fix reproduced usability defects and verify mobile and desktop behavior.

## Problem

A failed phone-code request discards the typed number. Repeated submits send duplicate requests. The same pending-state protection is absent from code verification. Other findings will be recorded with evidence before extending the implementation scope.

## Non-Goals

No brand redesign, framework change, real account creation or production test messages. Browser emulation is not physical iPhone certification.

## Existing System

The vanilla PWA renders auth screens through App/app.js. Auth requests use the existing auth service. Sharing has modal focus handling and legal acceptance is versioned. Website and PWA share design tokens.

## Recommended Architecture

### 1. Preserve form state and serialize authentication

Track pending requests in existing app state. Preserve the submitted phone number after errors, expose disabled/loading controls and accessible error feedback. Keep acceptance explicit and never persist OTP codes.

### 2. Evidence-led audit

Use isolated Impeccable design and detector assessments plus Chromium/WebKit functional fixtures. Cover narrow, phone, tablet and desktop layouts; errors, empty content, navigation, sharing and legal pages. Discard malformed test-fixture artifacts.

### 3. Release verification

Commit focused tests and fixes, review changes, run full root tests and build, merge via PR to application trunk, and verify affected production deployment SHA and HTTP output.
