# Zwibba OTP Per-Phone Rate Limit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Limiter les demandes OTP par numero (fenetre glissante via VerificationAttempt), 429 au-dela.

**Architecture:** Helper pur otp-rate-limit.ts (teste sans base) + application dans auth.service requestOtp (count VerificationAttempt dans la fenetre, HttpException 429). Verification : tests unitaires + typecheck (pnpm -C apps/api build) + smoke post-deploy (mode demo, numero allowliste).

**Tech Stack:** NestJS 11, Prisma 6, node:test via scripts/run-tests.mjs.

---

### Task 1: Index the planning docs
Append the two filenames to docs/plans/README.md. Commit docs: index otp-rate-limit plans.

### Task 2-3: Rate-limit policy helper (test then impl)
Create apps/api/test/auth/otp-rate-limit.test.ts then apps/api/src/auth/otp-rate-limit.ts. Verify pnpm -C apps/api test otp-rate-limit.

### Task 4: Enforce in requestOtp
Count recent VerificationAttempt for the phone within the window before requestVerification ; throw HttpException 429 when exceeded. Verify pnpm -C apps/api build typechecks.

### Task 5: Verification
pnpm -C apps/api test (helpers green), pnpm -C apps/api build (typecheck), root npm test. Post-deploy smoke: repeat request-otp on the demo allowlist number until the limit returns 429.
