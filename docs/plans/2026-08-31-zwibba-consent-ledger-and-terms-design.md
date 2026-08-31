# Zwibba Consent Ledger And Terms Design

**Date:** 2026-08-31

## Goal

Give Zwibba a provable legal basis for what it holds: versioned terms and privacy documents, an append-only consent ledger that ties every user to the exact document version they accepted, and a granular, withdrawable opt-in for the purposes that go beyond simply running the marketplace.

## Problem

No legal document exists anywhere in the repository. A search of the tracked files returns nothing for terms, conditions générales, privacy, politique de confidentialité, or mentions légales, and neither the PWA nor the landing references one. A user today signs up with a phone number and an OTP and agrees to nothing at all.

The account is created without a trace of acceptance. `verifyOtp` in `apps/api/src/auth/auth.service.ts` upserts a `User` and creates a `Session` in the same flow, and no other code path creates a user. There is consequently no way to answer the question an auditor, a regulator, or an acquirer will ask first: what did this person agree to, and when. The schema offers nothing to answer it with — all nineteen models are product state, none of them record a permission.

The regulatory position is unambiguous in both directions. Zwibba is operated from Belgium, so the GDPR applies on the establishment criterion regardless of where its users live, and Congolese users are additionally covered by the DRC digital code, ordonnance-loi 23/010 of 13 March 2023. The GDPR does not merely require consent where consent is the basis; it requires the controller to be able to *demonstrate* it, which an unversioned checkbox cannot do once the wording has changed twice.

The commercial consequence is the sharper one, and it is the reason this plan exists now rather than later. An acquirer's due diligence audits precisely this. A dataset whose licensing rights cannot be evidenced is not discounted, it is written off, because the buyer would inherit the liability along with the rows. The consent ledger is the mechanism that turns what Zwibba collects into an asset capable of surviving that audit.

The immediately preceding plan, `2026-08-31-zwibba-market-signals-capture`, deliberately made `SearchQueryEvent` and `ListingPriceEvent` identity-free, so neither needs consent to exist. This plan is what unlocks everything downstream that does touch identity, seller scoring above all, and it must be in place before the first such row is written rather than after.

## Non-Goals

- No seller scoring, no aggregation, no export, no third-party sharing. This plan builds the permission; using it is later work.
- No cookie or tracker banner. The PWA loads no third-party analytics or advertising script today, so there is nothing to gate.
- No account deletion and no data portability flow. Both are real obligations and each deserves its own plan.
- No admin interface for reading or auditing the ledger.
- No legal validation of the wording. The document text introduced here is a draft written to be reviewed by counsel before launch, and it is marked as unreviewed in the repository itself. The mechanism is what this plan guarantees; the words are what a lawyer must sign off.
- No change to `apps/mobile` or `apps/admin`.

## Existing System

`apps/api/src/auth/auth.controller.ts` exposes exactly two routes, `POST /auth/request-otp` and `POST /auth/verify-otp`, each a thin pass-through to `AuthService`. In `apps/api/src/auth/auth.service.ts`, `verifyOtp` checks the code through `OtpService`, throws `UnauthorizedException` when the verification is not approved, resolves the country through `resolvePhoneCountry`, upserts the `User` on `phoneNumber`, seeds a demo wallet, creates a `Session` with `computeSessionExpiry`, and marks pending `VerificationAttempt` rows approved. That upsert is the only place in the codebase where a `User` comes into existence.

`apps/api/prisma/schema.prisma` holds nineteen models. `User` carries `phoneNumber`, `countryCode`, `area`, `displayName`, `createdAt`, and its relations. `ListingLifecycleEvent` is the existing append-only precedent, and `SearchQueryEvent` and `ListingPriceEvent` from the previous plan follow the same discipline. Nothing in the schema records a permission, an acceptance, or a document version.

On the client, `App/services/auth-service.mjs` exports `createAuthService`, whose OTP methods post to `${apiBaseUrl}/auth/request-otp` and `${apiBaseUrl}/auth/verify-otp` with a JSON body. The three auth screens are `App/features/auth/welcome-screen.mjs`, `phone-input-screen.mjs`, which also exports `resolveDefaultPhonePrefix`, and `otp-screen.mjs`, each a `renderXxxScreen` function.

The landing already has a locale mechanism the documents can reuse: `src/site/locales/fr-cd.mjs`, `fr-be.mjs`, and `nl-be.mjs`, resolved through `src/site/locale-href.mjs`, with parity enforced by `tests/locale-parity.test.mjs`. The presence of `nl-be.mjs` matters here: a Belgian user is entitled to the documents in Dutch, so the document set is two document keys across three locales, six texts in total.

Per `CLAUDE.md`, Prisma is the source of truth for schema changes and migration SQL is never hand-written. API tests run through `apps/api/scripts/run-tests.mjs`, which accepts a substring filter; the PWA and site suites run from the repository root with `node --test tests/*.test.mjs`.

## Recommended Architecture

### 1. Legal documents as versioned, hashed content in the repository

The terms and the privacy notice live in the repository as content modules, one per document key and locale, so that every word is diffable, reviewable in a pull request, and attributable to a commit. A registry module declares, for each document key, the currently effective version, its date, and the SHA-256 of each localised body.

Storing the hash is what makes an acceptance provable years later: the ledger records which version a user accepted, and the hash proves the text of that version has not been quietly rewritten underneath the record. Versions are date-based rather than numeric so that a document, a migration, and a consent row can be reconciled by eye.

### 2. An append-only consent ledger that is never updated

A new `ConsentRecord` model records one row per decision: the user, the purpose, whether it was granted, the document key and version where the decision relates to a document, the locale actually shown, the market country, the source of the decision, and a timestamp.

Withdrawal writes a new row with the grant set to false. It never updates and never deletes an existing row. The current state of a permission is the most recent row for that user and purpose; the proof is the entire series. This is the same discipline as `ListingLifecycleEvent`, and it is the only shape that survives an audit, because a mutable consent flag can only ever assert the present and can never evidence the past.

### 3. Purposes as a closed registry that separates contract from consent

A small module enumerates the permitted purposes and marks each one required or optional. Conflating them is the most common way a consent design becomes worthless, so the distinction is made in code rather than in prose.

Accepting the terms is contract formation, not consent in the regulatory sense, and it is necessarily mandatory to use the service. Acknowledging the privacy notice records that the required information was actually presented. Those two are required. The third, allowing identity-linked data to feed derived products that Zwibba may license, is optional, and refusing it must leave the account fully functional.

That last constraint is not a nicety. Consent obtained by making the service conditional on it is not freely given, and consent that is not freely given is void — which would retroactively strip the value from every row it was supposed to authorise. Making the optional purpose genuinely refusable is therefore the single design decision that determines whether the resulting dataset is licensable at all.

### 4. Capture at the only moment the account exists

Because `verifyOtp` is the sole path through which a `User` is created, it is also the only place consent can be captured without leaving a window in which an account exists with no record attached. The client submits, alongside the code and phone number, the document versions it actually displayed and the user's choices on the optional purposes.

The service validates that the submitted versions are the currently effective ones and rejects a stale acceptance rather than silently recording it. A client running an old bundle showing last month's terms must be told to refresh, not quietly logged as having accepted the new text it never saw. The consent rows are then written in the same flow that already creates the `Session`, so an account and its permissions come into being together.

### 5. A withdrawal path that costs one endpoint

A session-guarded endpoint lets a user withdraw an optional purpose, writing the negative row. Required purposes cannot be withdrawn while the account exists, since they are the basis of the contract itself; withdrawing them means closing the account, which this plan explicitly does not implement and which the response says plainly rather than failing silently.

### 6. Documents surfaced in both surfaces and all three locales

The PWA links both documents from the authentication screens, before the OTP is confirmed, so the text is reachable at the moment it is being accepted rather than buried in a profile page afterwards. The landing exposes the same documents per locale through the existing `src/site/locales/` mechanism and its parity test, which will fail loudly if a Dutch or Congolese French version is forgotten.
