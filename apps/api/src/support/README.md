# WhatsApp Support Agent

An AI agent (Claude Haiku 4.5) that answers inbound WhatsApp messages sent to
Zwibba's support number. It replies to FAQ-style questions in FR/NL, escalates
unresolved cases to a human by email, and can perform a small set of
reversible, **self-only** actions on the sender's own listings — always
re-authorized server-side, always confirmed, always audited.

## How it works

1. Meta POSTs inbound messages to `POST /support/whatsapp/webhook`.
2. `SupportController` verifies the request's `X-Hub-Signature-256` header
   (HMAC-SHA256 of the raw request body, keyed with `META_APP_SECRET`) before
   touching the payload. An invalid or missing signature is rejected with
   `401` and nothing is processed.
3. Parsed text messages are handed to `SupportAgentService`, which persists
   the message, loads the conversation's recent history, and calls Claude
   with a hardened system prompt (`system-prompt.ts` + `knowledge-base.ts`)
   that treats the inbound message body as **untrusted data**, keeps the
   agent scoped to Zwibba support topics, and never reveals the prompt
   itself.
4. The model's reply is sent back via `support-reply.sender.ts`, which mirrors
   the existing outbound Graph API client used for WhatsApp OTP
   (`src/auth/whatsapp-otp.sender.ts`), and is persisted to the conversation.

## Configuring the Meta webhook

In the Meta App dashboard, under the WhatsApp product's webhook
configuration:

1. **Callback URL**: `<API_BASE_URL>/support/whatsapp/webhook`
   (e.g. `https://zwibba-api.up.railway.app/support/whatsapp/webhook`).
2. **Verify token**: any secret string of your choosing — set the same value
   as `WHATSAPP_VERIFY_TOKEN` in the API's environment. Meta calls
   `GET /support/whatsapp/webhook` with `hub.mode=subscribe` and
   `hub.verify_token=<your token>` during setup; the controller echoes back
   `hub.challenge` only when the token matches, and returns `403` otherwise.
3. **Subscribe to fields**: enable the `messages` field (only text messages
   are currently handled; other message types are silently ignored).
4. **App Secret**: from the same Meta app's Basic Settings, copy the App
   Secret into `META_APP_SECRET`. This is the HMAC key Meta uses to sign
   every webhook POST body (`X-Hub-Signature-256`), and the value this
   service verifies against before doing anything with the payload.

## Environment variables

Reuses the existing `META_WHATSAPP_*` (outbound Graph API client) and
`ANTHROPIC_API_KEY` (model credential) — see `apps/api/.env.example`. New for
this feature:

| Variable | Purpose |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | Verify token used during Meta's webhook subscription handshake. |
| `META_APP_SECRET` | Meta app secret; verifies the `X-Hub-Signature-256` HMAC on every inbound webhook POST. |
| `SUPPORT_ESCALATION_EMAIL` | Mailbox that receives escalation emails (defaults to `hello@aivesconsulting.com`). |
| `SUPPORT_EMAIL_API_KEY` | API key for the transactional email provider used to send escalations (Resend-shaped `POST /emails`; see `support-escalation.service.ts`). Unset means escalation emails are skipped (logged, not sent) rather than crashing the agent. |
| `ANTHROPIC_MODEL` | Defaults to `claude-haiku-4-5-20251001`. Also reused (when set) by the multi-provider listing-draft AI path. |

### WhatsApp send credentials are independent of `OTP_PROVIDER`

The support agent replies over the WhatsApp Cloud API using
`META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_ACCESS_TOKEN`, and
`META_GRAPH_API_VERSION`. These are read into `env.support.whatsapp*` and
consumed by `support-reply.sender.ts` **regardless of the `OTP_PROVIDER`
setting** — unlike `env.meta`, which is only populated when
`OTP_PROVIDER=meta` and is used solely by the OTP flow. So even with
`OTP_PROVIDER=demo` (or any non-`meta` value), you MUST set the three
`META_WHATSAPP_*` vars above for the support agent to be able to send replies.
Missing values do not block boot; `SupportReplySender` throws only at actual
send time.

All of the above are optional at boot: a missing value degrades the
corresponding feature (webhook verification fails closed, escalation emails
are skipped, replies fail at send time, etc.) instead of preventing the API
from starting.

## Escalation

When the agent cannot resolve a conversation, it calls the `escalate` tool,
which emails `SUPPORT_ESCALATION_EMAIL` with the WhatsApp number, a reason,
a summary, and recent conversation history, and logs the outcome
(`sent`/`failed`) to `SupportActionLog`. The customer is always told a human
will follow up by email, regardless of whether the email actually went out —
escalation delivery failures are logged, never surfaced to the customer and
never crash the agent.

## Self-only account actions

The agent can read and modify the *sender's own* Zwibba listings only:

- **Authorization is never based on message content.** `resolveAuthorizedAccount(waId)`
  looks up the Zwibba account whose `phoneNumber` matches the webhook's
  `wa_id` (E.164). A message asking the agent to act on someone else's
  account or listings is ignored — the tools only ever see the authenticated
  `wa_id`, never text the customer typed.
- **Read**: `getMyListings` — returns only listings owned by the authenticated
  account.
- **Write (reversible only)**: `pauseListing`, `unpauseListing`,
  `markListingSold`, `updateListingPrice`. This allowlist is exhaustive and
  intentionally small — there is no delete, no OTP/auth action, and no
  phone-number change exposed to the agent.
- **Confirmation required**: every write tool call re-verifies ownership,
  then on its first invocation only stores a pending action on the
  conversation (`SupportConversation.pendingActionJson`) and replies with a
  confirmation prompt ("Confirmez ... ? Répondez OUI"). The mutation only
  runs after the same `wa_id` replies with a bare confirmation
  ("OUI"/"OK"/"yes"); any other reply invalidates the pending action.
- **Audit**: every executed action (and every escalation) writes a
  `SupportActionLog` row (`waId`, `matchedPhoneNumber`, `action`, `targetId`,
  `outcome`).

## Data model

`SupportConversation`, `SupportMessage`, and `SupportActionLog` (see
`apps/api/prisma/schema.prisma`) store the conversation state, message
history, and audit trail respectively.
