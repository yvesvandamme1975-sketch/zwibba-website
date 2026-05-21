# Zwibba Production Roadmap

**Date:** 2026-05-21
**Status:** approved direction, phases not yet started

## Goal

Trace the three-phase sequence — Stabilisation → Soft Launch Lubumbashi → National Launch DRC — that will take Zwibba from its current internal-beta state (running on Railway, four numbered test accounts, OTP in demo mode) to a publicly-usable national classifieds platform with a working monetisation loop.

## Problem

Today Zwibba sits in an in-between state: the production stack is deployed and the App, API, and admin services are live on Railway since 2026-03-16 (see `docs/deployment/2026-03-16-zwibba-railway-production.md`), the internal beta device QA pass is documented (`docs/deployment/2026-04-05-zwibba-internal-beta-device-qa.md`), and the API has 243 passing tests including E2E flows for seller, messaging, and device matrix. Yet four things still gate any public opening: OTP runs in `demo` mode with a four-number allowlist, the URLs are still `*.up.railway.app`, there is no enacted legal framework (CGU / privacy / mandatory mentions), and the wallet that powers the boost monetisation has no real top-up channel.

We need an honest, ordered roadmap rather than a generic "things to do before launch" checklist — one that names what already exists, what is missing, and in what order the pieces unlock each other.

## Non-Goals

- This roadmap does not pick a specific Mobile Money provider (M-Pesa Vodacom DRC vs Orange Money vs Airtel Money) — that decision belongs to Phase C and depends on coverage data we have not yet collected.
- This roadmap does not specify marketing channels, acquisition budget, or campaign creative — same Phase C deferral.
- This roadmap does not include conformance to jurisdictions outside DRC (no EU-wide GDPR statement, no California CCPA). Phase B targets DRC users; cross-border traffic is treated as exceptional.
- This roadmap does not redefine the technical stack — `App/` stays vanilla JS ESM, `apps/api` stays NestJS + Prisma, `apps/admin` stays Node TS, `apps/mobile` stays Flutter. No rewrites.
- This roadmap does not commit to dates beyond Phase A. Phase B and C dates depend on Phase A outcomes.

## Existing System

**Infrastructure live today.** API at `api-production-b1b58.up.railway.app`, admin at `admin-production-c78b.up.railway.app`, App at `website-production-7a12.up.railway.app/App/`. Postgres provisioned on Railway. Cloudflare R2 bucket for media with pre-signed upload URLs. Twilio Verify service is **coded** (`apps/api/src/auth/twilio-verify.service.ts`) but **not yet activated** — the env var `OTP_PROVIDER` is `demo`, allowlist is `+243990000001` through `+243990000004` with demo code `123456`.

**Application state.** The PWA in `App/` is feature-complete for the seller and buyer journeys observed in the April internal-beta QA pass (publication with first-photo AI, manual price entry in CDF and USD, messaging, profile with city autocomplete, listing detail). The NestJS API exposes auth, boost, chat, drafts, health, listings, locations, media, moderation, profile, and wallet modules. The Flutter app in `apps/mobile/lib/` already mirrors the PWA features and services — its `pubspec.yaml` still reads `0.1.0+1 scaffold` but the code is not a scaffold, it is a working app waiting to be packaged for stores.

**Moderation.** `apps/api/src/moderation/moderation.service.ts` implements three statuses (`approved`, `blocked_needs_fix`, `pending_manual_review`), enforces vehicle photo presets (front, rear, sides, interior), provides labels for the FR user surface, and feeds the admin moderation queue. Nine E2E tests cover publish outcomes including incomplete drafts, vehicle-specific blocks, free listings, USD listings, and 32-bit price limit enforcement.

**Boost / monetisation.** `apps/api/src/boost/boost.service.ts` exposes a single `activateBoost` that debits 15 000 CDF from the user wallet and creates a 24h boost. The wallet exists (`apps/api/src/wallet/`) but there is **no payment provider integration** — no Mobile Money, no Stripe, no card processor. Top-up is currently impossible programmatically.

**Monitoring.** `apps/api/src/health/health.controller.ts` runs `SELECT 1` against Postgres and returns `{status: 'ok', database: 'up'}`. Railway uses this for liveness. No error tracking (Sentry or equivalent) is wired in. No business metrics surface exists.

**Plans discipline.** Fifty-plus design+implementation pairs in `docs/plans/` since 2026-03-14, the most recent finished pair being the conservative AI category disambiguation work on 2026-05-02. A new orientation layer was added on 2026-05-21 (`CLAUDE.md`, `AGENTS.md`, the agent-operating-briefs plan pair). One plan, `2026-05-15-zwibba-sell-tab-scroll-top-design.md`, has no implementation pair — to be checked and either closed or paired.

**Codex orchestration.** A skill `zwibba-plan-writer` was added 2026-05-21 to produce Zwibba-format plan pairs and prepare `codex exec` commands. The skill still hardcodes `--full-auto` in its generated command; this flag is deprecated in Codex CLI 0.128.0 and must be replaced with `--sandbox danger-full-access` alone.

## Recommended Architecture

### Phase A — Stabilisation (~30 days)

The goal of Phase A is to enter the next 30 days of internal-beta with zero open known-critical bugs, complete plan hygiene, and a monitoring floor that lets us notice incidents before users do. No public opening during this phase.

**A.1 — Close the plans backlog.** Resolve the orphan `2026-05-15-zwibba-sell-tab-scroll-top` plan: either pair it with an implementation doc and execute, or archive it explicitly with a note. Pay the technical debt on `zwibba-plan-writer` by replacing `--full-auto` with `--sandbox danger-full-access` in the SKILL.md and re-zipping the skill.

**A.2 — Decide Twilio go / no-go.** Two questions block any public opening: (a) is Twilio Verify procured and tested for +243 deliverability in DRC, (b) what is the per-SMS cost at expected volume? Resolve these by provisioning the service in test mode, running a deliverability pass on five real DRC numbers across Vodacom/Orange/Airtel, and pricing 1000 / 10 000 / 100 000 verifications per month. Decision: keep Twilio or evaluate alternatives (Africastalking, MessageBird, local provider).

**A.3 — Monitoring floor.** Three pieces: (a) Sentry (free tier sufficient for Phase A) wired into `apps/api/src/main.ts` and the App entry, (b) a Railway alert on `/healthz` failure with email/SMS notification to Yves, (c) a once-a-week manual review of a "Zwibba metrics" sheet — signups, listings published, manual moderation queue length, error count. The sheet can be filled by hand from `gh`/Railway logs initially; a proper dashboard belongs to Phase B.

**A.4 — Backup strategy.** Document the actual backup mechanism: Railway Postgres snapshot frequency on the current plan, R2 versioning status, and a written recovery procedure (what to do if Postgres is wiped, what to do if R2 loses an object). One-page runbook added to `docs/deployment/`.

**A.5 — Moderation queue audit.** Run a live test: as a tester account, publish a deliberately ambiguous listing that should trigger `pending_manual_review`, verify it lands in the admin queue, exercise the admin actions, confirm the user-side label refreshes. This is the operational dry-run that surfaces gaps in the moderation workflow before real users hit it.

### Phase B — Soft Launch Lubumbashi (sequenced, no hard date)

Phase B opens Zwibba to real public registration in the Lubumbashi metro area only, with no marketing push. The goal is to learn from a controlled flow of real users while keeping the option to scale back without reputational damage. Estimated cohort: a few hundred users in the first month.

**B.1 — OTP real (Twilio active).** Flip `OTP_PROVIDER=demo` to `OTP_PROVIDER=twilio` in Railway env. Add an application-level rate limit on `POST /auth/request-otp` (target: 3 OTP requests per phone per 15 min, 10 OTP requests per IP per 15 min) — without it a bot drains the Twilio budget in minutes. Implementation lives in `apps/api/src/auth/`.

**B.2 — Custom domain.** Acquire zwibba.cd (or .com / other), DNS to Railway, configure TLS, propagate `APP_BASE_URL`, `R2_PUBLIC_BASE_URL`, and hardcoded references inside `App/` and `apps/mobile/`. Update `server.mjs` redirect logic if any. New admin URL behind a non-guessable subdomain.

**B.3 — DRC legal minimum.** Three documents drafted with a DRC-competent lawyer or by careful research: (a) Conditions Générales d'Utilisation, (b) Politique de Confidentialité, (c) Mentions Légales (operator identity, hosting provider, contact). Linked from the App footer. Add an in-app moderation reporting flow ("signaler cette annonce") that feeds the existing `pending_manual_review` queue.

**B.4 — Backup activated.** Whatever was documented in A.4 is now actually scheduled and tested — at least one Postgres restore drill on a copy. R2 versioning enabled if not already.

**B.5 — Public registration page.** Replace direct entry into `App/#sell` with a landing that explains Zwibba, asks for phone verification, and lands on the home feed. Keep the `+243990000001..4` tester accounts working for ongoing internal QA.

### Phase C — National Launch DRC

Phase C opens Zwibba nationally with active marketing. Estimated cohort: tens of thousands of users in the first quarter. Phase C cannot start before Phase B has run for at least 30 days without a major incident.

**C.1 — Payment provider integration.** This is the structural blocker. Pick a Mobile Money provider with national DRC coverage, integrate top-up into the wallet (`apps/api/src/wallet/`), and enable real boost purchases. Without this, the monetisation loop is non-existent. The decision involves coverage (Vodacom M-Pesa, Orange Money, Airtel Money), fees, integration effort, and merchant onboarding time. Start the procurement conversations during Phase B so the integration is ready when C opens.

**C.2 — Scaling capacity.** Upgrade Railway plans for API and Postgres to handle 10x current load. Validate that R2 bandwidth is not throttled at the current plan. Add a CDN front (Cloudflare in front of R2 public URLs) if media bandwidth dominates costs. Load-test the API with a script that simulates 1000 concurrent publish flows.

**C.3 — Mobile native published.** Bump `apps/mobile/pubspec.yaml` from `0.1.0+1 scaffold` to a real version. Produce icons, splash screen, screenshots in multiple languages (FR, possibly Lingala / Swahili variants for store listings). Set up signing (iOS distribution cert, Android keystore). Submit to TestFlight first, then App Store production. Submit to Google Play with a closed track first, then production. Apple review can take weeks — start during Phase B.

**C.4 — Incident response.** Written plan for what happens when the API is down at night. Either: (a) Yves accepts a 6-hour mean-time-to-respond and documents it in the CGU, (b) Yves contracts an oncall (cher), or (c) Yves implements graceful degradation (read-only mode if Postgres is down). The choice depends on Phase B incident frequency and Phase C revenue.

**C.5 — Marketing activated.** Channels to evaluate: TikTok (where Yves already does AI watch), Facebook DRC, local radio Lubumbashi then Kinshasa, university partnerships, referral program with boost credits as incentive. Acquisition budget tied to revenue from C.1.

**C.6 — Operational monitoring upgrade.** Replace the once-a-week sheet from Phase A with a real dashboard (Plausible / Umami / Mixpanel for product metrics, Grafana / Railway native for infra). Daily review by Yves becomes an automated morning briefing (already a Cowork scheduled task pattern Yves uses).

## Open questions to resolve before this roadmap can be executed

1. Has Twilio Verify already been procured, or is the integration code waiting for the service to be set up?
2. Has any domain been reserved (zwibba.cd, zwibba.com, other), or is this a Phase B action?
3. What is the monthly budget on Railway + R2 + (future) Twilio + (future) Mobile Money fees?
4. Is Yves running this solo, or is there a partner or contractor for legal, marketing, oncall?
5. What is the target cohort size for Phase B (a few hundred or a few thousand) — this changes the rate-limit numbers and the legal pressure?
6. Does the `apps/api/src/ai/` moderation pipeline already auto-block certain category abuses (CSAM, weapons, drugs), or is that an explicit add for Phase A or B?

These questions feed back into the roadmap. Each one is small enough to answer in a single conversation or short investigation, but together they determine the order and depth of Phase A and B work.
