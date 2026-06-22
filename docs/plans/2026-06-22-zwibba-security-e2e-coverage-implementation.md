# Zwibba Security E2E Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter deux specs e2e api couvrant l expiration de session (401) et le rate-limit OTP par numero (429).

**Architecture:** Specs e2e sur le pattern existant (AppModule + @nestjs/testing + faux Prisma/Twilio + supertest). Verification : `node ./scripts/run-tests.mjs`, `pnpm -C apps/api build`.

**Tech Stack:** NestJS 11, @nestjs/testing, supertest, node:test.

---

### Task 1: Index the planning docs
Append the two filenames to docs/plans/README.md. Commit docs: index security-e2e-coverage plans.

### Task 2: session-expiry.e2e-spec.ts
Creer apps/api/test/auth/session-expiry.e2e-spec.ts : session expiree -> 401, future/null -> 200 sur GET /profile.

### Task 3: otp-rate-limit.e2e-spec.ts
Creer apps/api/test/auth/otp-rate-limit.e2e-spec.ts : count >= limite -> 429, count = 0 -> 201.

### Task 4: Verification
`pnpm -C apps/api test` vert, `pnpm -C apps/api build` typecheck. Aucun changement de comportement applicatif.
