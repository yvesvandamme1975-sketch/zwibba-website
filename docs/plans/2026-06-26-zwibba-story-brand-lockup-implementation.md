# Zwibba Story Brand Lockup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lockup "Je vends sur" + logo Zwibba agrandi et centre sous la photo dans l image story.

**Architecture:** composeStoryImage rasterise le logo, le trim + resize a 560px, mesure sa hauteur, centre le bloc label+logo dans l espace photo->footer. Verifie par typecheck + suite api + rendu visuel d echantillon.

**Tech Stack:** NestJS, sharp, node:test.

---

### Task 1: Index the planning docs
Append the two filenames to docs/plans/README.md. Commit docs: index story-brand-lockup plans.

### Task 2: Recompose le lockup branding
Dans compose-story-image.ts : photo top 96 ; logo trim + resize 560 ; bloc label ("Je vends sur" Manrope 72 vert) + logo centre verticalement dans l espace photo->footer, logo centre horizontalement. Verifier pnpm -C apps/api build (typecheck) + pnpm -C apps/api test (suite verte) + rendu d un echantillon PNG.
