# Zwibba In-App Message Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real in-app message notifications to Zwibba with unread counts, a bottom-tab badge, inbox unread styling, and read clearing when a thread is opened.

**Architecture:** Use persisted read markers on `ChatThread` as the unread source of truth. Reuse the existing browser polling controller to refresh inbox state on all non-thread routes and refresh thread state on open thread routes.

**Tech Stack:** Vanilla JS browser app, NestJS API, Prisma/Postgres, Railway, Node test runner

---

### Task 1: Lock the unread contract with failing tests

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/test/chat/chat.e2e-spec.ts`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/messages-screen.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/app-tab-shell.test.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/chat-live-refresh-controller.test.mjs`

**Red**
- Add API tests for unread counts and read clearing.
- Add browser tests for inbox unread styling and Messages tab badge.
- Add polling-controller tests proving inbox refresh runs on non-thread routes.

**Verify**
```bash
pnpm -C apps/api test -- chat
node --test tests/messages-screen.test.mjs tests/app-tab-shell.test.mjs tests/chat-live-refresh-controller.test.mjs
```

### Task 2: Add persisted unread tracking

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/prisma/schema.prisma`
- Create: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/prisma/migrations/20260328210000_chat_unread_tracking/migration.sql`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/apps/api/src/chat/chat.service.ts`

**Green**
- Add `buyerLastReadAt` and `sellerLastReadAt` to `ChatThread`.
- Compute unread counts in inbox based on viewer role and message timestamps.
- Mark the thread read for the viewer when fetching a thread.
- Keep sender unread count cleared when sending a message.

**Verify**
```bash
pnpm -C apps/api test -- chat
pnpm -C apps/api exec tsc --noEmit
```

### Task 3: Add the browser notification UI

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/components/app-tab-shell.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/chat/inbox-screen.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/app.css`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/app.js`

**Green**
- Pass total unread count into the tab shell and render a badge on `Messages`.
- Add unread styling and markers on inbox cards.
- Clear local unread state for the open thread after successful thread fetch.

**Verify**
```bash
node --test tests/messages-screen.test.mjs tests/app-tab-shell.test.mjs
npm run smoke:app
```

### Task 4: Expand live refresh to keep notifications current

**Files:**
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/App/features/chat/chat-live-refresh-controller.mjs`
- Modify: `/Users/pc/zwibba-website-worktrees/browser-live/tests/chat-live-refresh-controller.test.mjs`

**Green**
- Poll inbox on all non-thread routes when a session exists.
- Continue polling only the open thread on thread routes.

**Verify**
```bash
node --test tests/chat-live-refresh-controller.test.mjs
```

### Task 5: Deploy and live-check

**Verify**
- Deploy API and website if needed
- Confirm:
  - new unread badge appears on `Messages`
  - unread inbox cards are highlighted
  - opening a thread clears its unread indicator
  - unread badge updates while user is on another tab
