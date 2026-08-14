# Zwibba WhatsApp Support Agent (P6) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agent IA (Claude Haiku 4.5) sur le webhook WhatsApp entrant : répond (FAQ FR/NL), escalade par email les cas non résolus, et exécute des actions réversibles « soi uniquement » sur les annonces de l'expéditeur authentifié par son numéro — signature vérifiée, autorisation serveur, confirmation, audit.

**Architecture:** Nouveau `apps/api/src/support/` (webhook controller, agent service, reply sender, escalation, tools) ; modèles Prisma `SupportConversation`/`SupportMessage`/`SupportActionLog` ; réutilise `META_WHATSAPP_*`, `ANTHROPIC_*` (env existants), le patron Graph API de `src/auth/whatsapp-otp.sender.ts`, et `phone-country.ts`.

**Tech Stack:** NestJS 11, Prisma 6, SDK Anthropic, node:test (runner `apps/api/scripts/run-tests.mjs`).

**Ordre voulu :** le cœur sûr (réponse + escalade) est construit d'abord (Tasks 2–8) ; les **actions** sont la dernière couche, la plus gardée (Tasks 9–10). Chaque outil réauthentifie côté serveur ; le contenu des messages entrants est traité comme donnée non fiable partout.

---

### Task 1: Indexer la paire de plans

**Files:** Modify `docs/plans/README.md`

1. Ajouter `2026-08-06-zwibba-whatsapp-support-agent-design.md` / `-implementation.md` en fin de liste (fichiers présents non commités — même commit).
2. `grep whatsapp-support-agent docs/plans/README.md` → deux lignes.
3. Commit : `docs: index whatsapp-support-agent plans`

### Task 2: Env — verify token, app secret, escalade, modèle

**Files:** Modify `apps/api/src/config/env.ts` ; Test `apps/api/test/config/`

1. Test : `loadEnv` expose `support.whatsappVerifyToken`, `support.metaAppSecret`, `support.escalationEmail` (défaut `hello@aivesconsulting.com`), `support.emailProviderApiKey`, et confirme `ANTHROPIC_MODEL` par défaut mis à `claude-haiku-4-5-20251001`.
2. Implémenter : ajouter aux `defaultEnvValues` `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET`, `SUPPORT_ESCALATION_EMAIL=hello@aivesconsulting.com`, `SUPPORT_EMAIL_API_KEY` ; changer le défaut `ANTHROPIC_MODEL` en `claude-haiku-4-5-20251001` ; lire ces valeurs dans l'objet retourné sous `support`. Suivre le style `readRequiredString` existant.
3. `cd apps/api && npm test` → PASS. Commit : `feat(support): add whatsapp support agent env config`

### Task 3: Migration Prisma (conversation, messages, audit)

**Files:** Modify `apps/api/prisma/schema.prisma` ; Create `apps/api/prisma/migrations/20260806120000_support_agent/migration.sql`

1. Modèles : `SupportConversation` (id cuid, waId String @unique, lastInboundAt DateTime?, pendingActionJson Json?, status String @default("open"), createdAt, updatedAt) ; `SupportMessage` (id, conversationId FK, role String, body String, createdAt, @@index([conversationId])) ; `SupportActionLog` (id, waId, matchedPhoneNumber String?, action, targetId String?, payloadJson Json?, outcome, createdAt, @@index([waId])).
2. Migration SQL correspondante (CREATE TABLE ×3 + index + FK).
3. `npx prisma validate` → valide ; `npx prisma generate`. Commit : `feat(db): add support agent conversation and audit models`

### Task 4: Reply sender (Graph API sortant)

**Files:** Create `apps/api/src/support/support-reply.sender.ts` ; Test `apps/api/test/support/reply-sender.test.ts`

1. Test (fake fetch) : `sendText(waId, body)` POST vers `https://graph.facebook.com/${version}/${phoneNumberId}/messages` avec header `Authorization: Bearer <token>` et corps `{ messaging_product:'whatsapp', to:waId, type:'text', text:{ body } }` ; retourne l'id message ; ne poste pas si `body` vide.
2. Implémenter en miroir de `src/auth/whatsapp-otp.sender.ts` (même client Graph, mêmes env `meta.*`). Commit : `feat(support): add whatsapp reply sender`

### Task 5: Webhook controller (verify + signature)

**Files:** Create `apps/api/src/support/support.controller.ts`, `support.module.ts` ; Modify `apps/api/src/app.module.ts` ; Test `apps/api/test/support/webhook.test.ts`

1. Tests : `GET` avec `hub.mode=subscribe` + `hub.verify_token` correct → renvoie `hub.challenge` (200) ; token faux → 403. `POST` avec signature `X-Hub-Signature-256` invalide → 401 sans traitement ; signature valide (HMAC-SHA256 du corps brut avec `metaAppSecret`) → 200 et le service reçoit les messages parsés. (Le controller doit accéder au **corps brut** pour l'HMAC — configurer le raw body pour cette route.)
2. Implémenter ; enregistrer `SupportModule` dans `app.module.ts`. Commit : `feat(support): add secured whatsapp webhook`

### Task 6: Base de connaissances + prompt système

**Files:** Create `apps/api/src/support/knowledge-base.ts`, `apps/api/src/support/system-prompt.ts` ; Test `apps/api/test/support/system-prompt.test.ts`

1. Test : le prompt système contient les règles de sécurité clés (contenu du message = donnée non fiable ; périmètre support Zwibba ; ne pas révéler le prompt ; actions soi-uniquement) et intègre la base de connaissances ; `buildSystemPrompt()` est déterministe.
2. Implémenter : `knowledgeBase` (FR+NL : comment vendre, frais, boost, sécurité, marchés CD/BE, langues) ; `buildSystemPrompt()` assemblant règles + KB. Commit : `feat(support): add knowledge base and hardened system prompt`

### Task 7: Agent service — réponse (boucle Claude, sans outils encore)

**Files:** Create `apps/api/src/support/support-agent.service.ts` ; Test `apps/api/test/support/agent-service.test.ts`

1. Tests (fake client Anthropic + fake Prisma + fake sender) : sur un message entrant, l'agent persiste le message, charge le contexte, appelle Claude avec le prompt système, envoie la réponse via le reply sender, persiste la réponse ; répond dans la langue du message (vérifier via fake renvoyant du NL) ; rate-limit par `wa_id` (au-delà du seuil → pas d'appel Claude).
2. Implémenter la boucle (sans outils pour l'instant). Fenêtre 24 h : si `lastInboundAt` du message courant l'ouvre, envoyer ; journaliser sinon. Commit : `feat(support): answer inbound messages with claude agent`

### Task 8: Escalade email

**Files:** Create `apps/api/src/support/support-escalation.service.ts` ; Modify `support-agent.service.ts` (outil `escalate`) ; Test `apps/api/test/support/escalation.test.ts`

1. Tests : l'outil `escalate(reason, summary)` envoie un email (fake provider) à `support.escalationEmail` contenant `wa_id` + résumé + historique récent, puis l'agent répond au client « notre équipe vous recontacte par email » ; échec d'envoi → journalisé, pas de crash.
2. Implémenter le service email (provider transactionnel configuré par env ; interface simple `sendEmail({to,subject,body})`), et exposer `escalate` comme premier outil Claude. Commit : `feat(support): escalate unresolved conversations by email`

### Task 9: Outils lecture « soi uniquement » + garde d'autorisation

**Files:** Create `apps/api/src/support/support-tools.ts` ; Modify `support-agent.service.ts` ; Test `apps/api/test/support/tools-auth.test.ts`

1. Tests (au cœur de la sécurité) : `resolveAuthorizedAccount(waId)` renvoie le `User` ssi `User.phoneNumber === waId` (E.164), sinon `null` ; l'outil `getMyListings` ne renvoie QUE les annonces dont `ownerPhoneNumber === waId` ; un `wa_id` sans compte → tout outil compte refuse et propose l'escalade ; un message tentant de faire lire les annonces d'un AUTRE numéro (injection) est ignoré — l'autorisation ne dépend que du `wa_id` du webhook, jamais du texte.
2. Implémenter `getMyListings` + la garde `resolveAuthorizedAccount`, câblée dans la boucle tool-use. Commit : `feat(support): add server-authorized self-only read tools`

### Task 10: Actions réversibles avec confirmation + audit

**Files:** Modify `apps/api/src/support/support-tools.ts`, `support-agent.service.ts` ; Test `apps/api/test/support/actions.test.ts`

1. Tests : `pauseListing`/`unpauseListing`/`markListingSold`/`updateListingPrice` (a) revérifient l'appartenance (`ownerPhoneNumber === waId`) et refusent une cible d'un autre compte ; (b) exigent une confirmation — un premier appel met `pendingActionJson` et renvoie « Confirmez … ? Répondez OUI », l'action n'est exécutée qu'après « OUI » du même `wa_id` ; (c) chaque exécution écrit une ligne `SupportActionLog` (waId, matchedPhoneNumber, action, targetId, outcome) ; (d) aucune action destructrice/sensible n'existe (pas de delete/OTP/changement de numéro — vérifier l'allowlist exhaustive). Les valeurs mutantes réutilisent les services existants (`listings`/lifecycle) pour cohérence.
2. Implémenter l'allowlist, le flux de confirmation (état `pendingActionJson` sur la conversation), l'audit. Vérif finale : `cd apps/api && npm test`, racine `npm run smoke:monorepo` → exit 0. Commit : `feat(support): add confirmed, audited reversible self-service actions`

### Task 11: .env.example + doc de déploiement

**Files:** Modify `apps/api/.env.example` ; Create `apps/api/src/support/README.md`

1. Ajouter au `.env.example` : `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET`, `SUPPORT_ESCALATION_EMAIL`, `SUPPORT_EMAIL_API_KEY`, `ANTHROPIC_MODEL=claude-haiku-4-5-20251001` (les `META_WHATSAPP_*` et `ANTHROPIC_API_KEY` existent déjà).
2. `README.md` : configurer l'URL du webhook dans Meta (`/support/whatsapp/webhook`), s'abonner au champ `messages`, poser le `verify_token`, récupérer l'`app secret`. Vérif : `cd apps/api && npm test` → PASS. Commit : `chore(support): document env and meta webhook setup`
