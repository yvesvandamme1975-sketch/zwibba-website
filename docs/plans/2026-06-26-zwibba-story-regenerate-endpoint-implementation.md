# Zwibba Story Regenerate Endpoint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Endpoint admin pour re-generer l image story d une annonce en preservant updatedAt.

**Architecture:** ModerationService.regenerateStory (await bake + restore updatedAt via $executeRaw) ; controleur POST :listingId/regenerate-story garde admin secret. Verifie par typecheck + suite api ; valide en live par un re-bake de masse.

**Tech Stack:** NestJS, Prisma ($executeRaw), sharp.

---

### Task 1: Index the planning docs
Append the two filenames to docs/plans/README.md. Commit docs: index story-regenerate-endpoint plans.

### Task 2: Service + endpoint
moderation.service.ts regenerateStory ; moderation.controller.ts POST :listingId/regenerate-story (requireAdminSecret). Verifier pnpm -C apps/api build + pnpm -C apps/api test (suite verte).
