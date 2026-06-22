# Zwibba API Runtime Security Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expirer les sessions, rate-limiter les endpoints OTP, et restreindre le CORS a une liste blanche configurable, en preservant la PWA.

**Architecture:** Helpers purs testes sans base (session-expiry, allowed-origins) + cablage NestJS (auth.service, app.module ThrottlerModule, main.ts enableCors). Verification : tests unitaires (node ./scripts/run-tests.mjs), typecheck (pnpm -C apps/api build), smokes post-deploy.

**Tech Stack:** NestJS 11, @nestjs/throttler, Prisma 6, node:test via scripts/run-tests.mjs.

---

### Task 1: Index the planning docs
Append the two filenames to docs/plans/README.md. Commit docs: index api-runtime-security plans.

### Task 2-3: Session expiry helper (test then impl)
Create apps/api/test/auth/session-expiry.test.ts (computeSessionExpiry, isSessionExpired). Create apps/api/src/auth/session-expiry.ts. Verify pnpm -C apps/api test session-expiry.

### Task 4: Wire session expiry into auth.service.ts
Set expiresAt on session.create ; return null in findSessionToken when isSessionExpired. Verify pnpm -C apps/api build typechecks.

### Task 5-6: Allowed origins helper (test then impl)
Create apps/api/test/config/allowed-origins.test.ts and apps/api/src/config/allowed-origins.ts. Verify pnpm -C apps/api test allowed-origins.

### Task 7: Wire CORS whitelist into main.ts
app.enableCors({ origin: resolveAllowedOrigins(process.env) }). Verify typecheck.

### Task 8: Rate-limit OTP
Add @nestjs/throttler ; ThrottlerModule.forRoot conservative limit + APP_GUARD ThrottlerGuard in app.module.ts. Verify typecheck.

### Task 9: Cross-cutting verification
pnpm -C apps/api build (typecheck), pnpm -C apps/api test (helpers green), root npm test, admin test. Post-deploy smokes: health, listing GET, cross-origin CORS, OTP burst 429. Skip commit (no file change).
