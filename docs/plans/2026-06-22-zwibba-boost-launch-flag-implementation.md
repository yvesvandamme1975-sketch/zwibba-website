# Zwibba Boost Launch Flag Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Flag ZWIBBA_BOOST_ENABLED (defaut actif) qui, mis a false, fait refuser POST /boost en 403.

**Architecture:** env.ts expose boost.enabled (actif sauf valeur exacte false) ; BoostService leve ForbiddenException quand desactive. Verification : tests api + typecheck. Defaut inchange => deploiement sans risque.

**Tech Stack:** NestJS 11, Prisma 6, node:test, supertest.

---

### Task 1: Index the planning docs
Append the two filenames to docs/plans/README.md. Commit docs: index boost-launch-flag plans.

### Task 2: Flag d environnement
env.ts : type boost.enabled + parsing (ZWIBBA_BOOST_ENABLED ?? 'true') !== 'false'. Assertion par defaut dans test/config/env.test.ts.

### Task 3: Garde BoostService
boost.service.ts : loadEnv + ForbiddenException en tete de activateBoost si desactive. Test e2e : boost desactive -> 403, aucun debit.

### Task 4: Verification
pnpm -C apps/api test vert, pnpm -C apps/api build typecheck. Comportement par defaut inchange.
