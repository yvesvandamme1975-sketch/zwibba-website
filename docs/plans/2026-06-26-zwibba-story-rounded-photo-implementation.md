# Zwibba Story Rounded Photo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Coins arrondis sur la photo de l image story.

**Architecture:** Masque SVG rect arrondi (rx 48) applique a la photo via sharp composite dest-in avant compositing sur le canvas. Verifie par typecheck + suite api + rendu d echantillon.

**Tech Stack:** NestJS, sharp, node:test.

---

### Task 1: Index the planning docs
Append the two filenames to docs/plans/README.md. Commit docs: index story-rounded-photo plans.

### Task 2: Masque coins arrondis
Dans compose-story-image.ts : constante PHOTO_RADIUS, masque dest-in sur la photo. Verifier pnpm -C apps/api build + pnpm -C apps/api test + rendu d un echantillon PNG.
