# Zwibba Auth WhatsApp Cloud OTP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer Twilio Verify par l'envoi OTP direct via le WhatsApp Cloud API de Meta, en internalisant la génération/stockage/vérification du code, tout en gardant le mode `demo`.

**Architecture:** Renommage `TwilioVerifyService → OtpService` (mécanique). Util pur `otp-code.ts` (génération + hachage + comparaison à temps constant). Modèle `OtpChallenge` (codeHash, expiresAt, attemptCount, consumedAt). `OtpService` gère le cycle local ; `WhatsappOtpSender` envoie le template d'authentification Meta. `OtpProvider = 'demo' | 'meta'` (drop `twilio`), config `META_*` requise en mode `meta`. `AuthService` et le rate-limit inchangés.

**Tech Stack:** NestJS API (injection `@Inject` explicite obligatoire), Prisma 6, TypeScript, `node:crypto`, custom node `--test` runner (`apps/api/scripts/run-tests.mjs`).

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append to the current priority docs list in `docs/plans/README.md`, before the "Legacy docs" trailer:

```
- `2026-06-23-zwibba-auth-whatsapp-cloud-otp-design.md`
- `2026-06-23-zwibba-auth-whatsapp-cloud-otp-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "auth-whatsapp-cloud-otp" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index auth-whatsapp-cloud-otp plans"
```

---

### Task 2: Rename `TwilioVerifyService` to `OtpService` (no behavior change)

**Files:**
- Rename: `apps/api/src/auth/twilio-verify.service.ts` → `apps/api/src/auth/otp.service.ts`
- Modify: `apps/api/src/auth/auth.module.ts`, `apps/api/src/auth/auth.service.ts`
- Modify: the 14 e2e specs under `apps/api/test/` that reference `TwilioVerifyService`

**Step 1: Apply the mechanical rename**

Rename the file and class (`TwilioVerifyService` → `OtpService`), keeping the method signatures `requestVerification(phoneNumber)` and `checkVerification({ code, phoneNumber })` unchanged. Update every reference found by `git grep -l "TwilioVerifyService" apps/api`: the import paths (`./twilio-verify.service` → `./otp.service`), the DI token in `auth.module.ts` and `auth.service.ts`, and in each spec the `.overrideProvider(TwilioVerifyService)` plus the local fake class (`_FakeTwilioVerifyService` → `_FakeOtpService`). No logic changes.

**Step 2: Run the full API suite to verify it is still green**

Run: `pnpm -C apps/api test`
Expected: PASS — same test count as before, no failures (pure rename).

**Step 3: Commit**

```bash
git add apps/api/src/auth apps/api/test
git commit -m "refactor: rename TwilioVerifyService to OtpService"
```

---

### Task 3: Failing test — OTP code util

**Files:**
- Create: `apps/api/test/auth/otp-code.test.ts`

**Step 1: Write the failing test**

Add unit tests for `apps/api/src/auth/otp-code.ts` (not yet created): `generateOtpCode()` returns a 6-digit numeric string; `hashOtpCode(code)` returns a non-empty hash that is not equal to the code; `verifyOtpCode(code, hashOtpCode(code))` is `true`; `verifyOtpCode('000000', hashOtpCode('123456'))` is `false`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- otp-code`
Expected: FAIL because `apps/api/src/auth/otp-code.ts` does not exist.

**Step 3: Commit**

```bash
git add apps/api/test/auth/otp-code.test.ts
git commit -m "test: add otp code helper expectations"
```

---

### Task 4: Implement the OTP code util

**Files:**
- Create: `apps/api/src/auth/otp-code.ts`

**Step 1: Implement**

Implement `generateOtpCode()` using `node:crypto` (6 digits, no modulo bias), `hashOtpCode(code)` (SHA-256 over the code plus a fixed application salt, hex), and `verifyOtpCode(code, hash)` using `crypto.timingSafeEqual` over the recomputed hash. Pure module, no DOM, no Nest decorators.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- otp-code`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/auth/otp-code.ts
git commit -m "feat: add otp code helper"
```

---

### Task 5: Add the `OtpChallenge` model (additive migration)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260623160000_otp_challenge/migration.sql`

**Step 1: Write the schema change and migration**

Add `model OtpChallenge` with `id String @id @default(cuid())`, `phoneNumber String`, `codeHash String`, `expiresAt DateTime`, `attemptCount Int @default(0)`, `consumedAt DateTime?`, `createdAt DateTime @default(now())`, `@@index([phoneNumber])`. Migration SQL:

```sql
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OtpChallenge_phoneNumber_idx" ON "OtpChallenge"("phoneNumber");
```

**Step 2: Verify the Prisma client regenerates**

Run: `pnpm -C apps/api prisma:generate`
Expected: completes with "Generated Prisma Client"; `rg -n "model OtpChallenge" apps/api/prisma/schema.prisma` matches.

**Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260623160000_otp_challenge/migration.sql
git commit -m "feat: add OtpChallenge model"
```

---

### Task 6: Failing test — OtpService local lifecycle (demo mode)

**Files:**
- Create: `apps/api/test/auth/otp-service.test.ts`

**Step 1: Write the failing test**

With the env provider set to `demo`, assert on `OtpService` (using a fake Prisma exposing `otpChallenge` and an injected no-op sender): `requestVerification` for an allowlisted number creates an `OtpChallenge` with a hashed `demoCode`, a future `expiresAt`, and does NOT call the sender; `checkVerification` with the correct `demoCode` returns `{ status: 'approved' }` and marks the challenge consumed; a wrong code returns a non-approved status and increments `attemptCount`; an expired challenge is rejected; exceeding the attempt cap invalidates the challenge.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- otp-service`
Expected: FAIL because `OtpService` still uses the legacy Twilio/demo branch without local challenge storage.

**Step 3: Commit**

```bash
git add apps/api/test/auth/otp-service.test.ts
git commit -m "test: expect local otp challenge lifecycle in demo mode"
```

---

### Task 7: Implement the local OTP lifecycle in `OtpService`

**Files:**
- Modify: `apps/api/src/auth/otp.service.ts`

**Step 1: Implement**

Rewrite `OtpService` to own the challenge lifecycle via Prisma `otpChallenge` and `otp-code.ts`. `requestVerification`: in `demo` mode keep the allowlist check and use `env.otp.demoCode`; otherwise generate a random code; invalidate prior unconsumed challenges for the number, create a new `OtpChallenge` (`codeHash`, `expiresAt = now + 5 min`), and (non-`demo` only) call the injected sender. Return `{ sid: challenge.id, status: 'pending' }`. `checkVerification`: load the latest unconsumed, unexpired challenge; if none → not approved; increment `attemptCount`; beyond the cap (5) mark it consumed/invalid; compare with `verifyOtpCode`; on success set `consumedAt` and return `{ status: 'approved' }`. Inject `PrismaService` and the sender with explicit `@Inject`.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- otp-service`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/auth/otp.service.ts
git commit -m "feat: own otp challenge lifecycle in OtpService"
```

---

### Task 8: Failing test — WhatsApp Cloud sender payload

**Files:**
- Create: `apps/api/test/auth/whatsapp-otp-sender.test.ts`

**Step 1: Write the failing test**

With a fake `fetchFn`, assert `WhatsappOtpSender.sendAuthenticationCode({ phoneNumber: '+243990000001', code: '123456' })` (not yet created) issues a POST to `https://graph.facebook.com/v{version}/{phoneNumberId}/messages`, with an `Authorization: Bearer {accessToken}` header, a JSON body where `messaging_product` is `whatsapp`, `to` is the number WITHOUT the leading `+`, `type` is `template`, the template `name`/`language` match the configured values, and the components include BOTH a `body` parameter carrying the code AND a button component carrying the code. Assert a non-2xx response throws and the code never appears in the thrown message.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- whatsapp-otp-sender`
Expected: FAIL because the module does not exist.

**Step 3: Commit**

```bash
git add apps/api/test/auth/whatsapp-otp-sender.test.ts
git commit -m "test: expect whatsapp cloud authentication payload"
```

---

### Task 9: Implement the WhatsApp Cloud sender

**Files:**
- Create: `apps/api/src/auth/whatsapp-otp.sender.ts`

**Step 1: Implement**

Implement `WhatsappOtpSender` (injectable, `@Inject` for any deps, accepts an optional `fetchFn` defaulting to `globalThis.fetch`). `sendAuthenticationCode({ phoneNumber, code })` builds the Graph API URL from `env.meta` (`graphApiVersion`, `phoneNumberId`), sends the authentication template with the recipient in E.164 without `+`, the `body` parameter and the copy-code/one-tap button parameter both set to the code, and `Authorization: Bearer {accessToken}`. On non-2xx, throw a sanitized error (no code leak).

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- whatsapp-otp-sender`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/auth/whatsapp-otp.sender.ts
git commit -m "feat: add whatsapp cloud otp sender"
```

---

### Task 10: Failing test — OtpService meta mode wiring

**Files:**
- Modify: `apps/api/test/auth/otp-service.test.ts`

**Step 1: Write the failing test**

Add a case with env provider `meta` and a fake sender that captures its arguments: `requestVerification` generates a random 6-digit code, calls the sender exactly once with that code and the phone number, and stores a hashed challenge; `checkVerification` with the captured code returns `{ status: 'approved' }`. Assert the sender is NOT called in demo mode.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- otp-service`
Expected: FAIL because the meta branch does not yet call the sender.

**Step 3: Commit**

```bash
git add apps/api/test/auth/otp-service.test.ts
git commit -m "test: expect meta mode to send via whatsapp sender"
```

---

### Task 11: Wire the sender into `OtpService` meta mode

**Files:**
- Modify: `apps/api/src/auth/otp.service.ts`

**Step 1: Implement**

In `requestVerification`, when the provider is `meta`, call `whatsappOtpSender.sendAuthenticationCode({ phoneNumber, code })` after persisting the challenge; never call it in `demo` mode.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- otp-service`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/auth/otp.service.ts
git commit -m "feat: send meta otp via whatsapp sender"
```

---

### Task 12: Failing test — env provider `meta` and removal of `twilio`

**Files:**
- Modify: `apps/api/test/config/env.test.ts`

**Step 1: Write the failing test**

Assert that `loadEnv` accepts `OTP_PROVIDER=meta` and exposes an `meta` config (`phoneNumberId`, `accessToken`, `templateName`, `templateLang`, `graphApiVersion`) read from the `META_WHATSAPP_*`/`META_GRAPH_API_VERSION` vars, requiring them in production when provider is `meta`; that the default provider is `demo`; and that `OTP_PROVIDER=twilio` is rejected.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- env`
Expected: FAIL because env still models `twilio` and not `meta`.

**Step 3: Commit**

```bash
git add apps/api/test/config/env.test.ts
git commit -m "test: expect meta otp provider env"
```

---

### Task 13: Implement the env changes

**Files:**
- Modify: `apps/api/src/config/env.ts`

**Step 1: Implement**

Change `OtpProvider` to `'demo' | 'meta'`, set default `OTP_PROVIDER = 'demo'`, update `readOtpProvider` to accept `demo`|`meta`, add the `meta` config block (required when provider is `meta`), and remove the `twilio` block and `TWILIO_*` defaults/readers.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- env`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/config/env.ts
git commit -m "feat: replace twilio otp env with meta provider"
```

---

### Task 14: Wire the sender in the auth module and confirm the end-to-end demo flow

**Files:**
- Modify: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/test/auth/request-otp.e2e-spec.ts`

**Step 1: Implement and assert**

Provide `WhatsappOtpSender` (and `OtpService`) in `auth.module.ts`. Extend `request-otp.e2e-spec.ts` to assert that, in demo mode, `POST /auth/request-otp` then `POST /auth/verify-otp` with the demo number and `demoCode` still returns a session — proving the full flow works through the new local-challenge path without any external call.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- request-otp`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/api/src/auth/auth.module.ts apps/api/test/auth/request-otp.e2e-spec.ts
git commit -m "feat: wire whatsapp otp sender and verify demo flow"
```

---

### Task 15: Final cross-cutting verification

**Files:**
- None (verification only)

**Step 1: Run the full API suite and prisma generate**

Run: `pnpm -C apps/api prisma:generate && pnpm -C apps/api test`
Expected: client generates without error and all API tests PASS.

**Step 2: Confirm Twilio is fully removed and security invariants hold**

Run: `rg -n "twilio|Twilio|TWILIO" apps/api/src && rg -n "codeHash|timingSafeEqual|expiresAt|attemptCount" apps/api/src/auth`
Expected: no remaining Twilio references in `apps/api/src`, and the OTP path hashes the code, compares in constant time, enforces expiry, and caps attempts. Operational reminder for the deploy: set `OTP_PROVIDER=meta` plus `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_TEMPLATE_NAME`, `META_WHATSAPP_TEMPLATE_LANG`, `META_GRAPH_API_VERSION` on Railway, and remove the `TWILIO_*` secrets; production env validation will fail fast if any `META_*` value is missing while provider is `meta`.

**Step 3:** Skip the commit step for this task because no file was modified.
