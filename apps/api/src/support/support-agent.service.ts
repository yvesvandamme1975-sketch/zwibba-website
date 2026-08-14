import { Inject, Injectable, Optional } from '@nestjs/common';

import { loadEnv } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { SupportEscalationService } from './support-escalation.service';
import { SupportReplySender } from './support-reply.sender';
import {
  ACCOUNT_TOOL_NAMES,
  executePendingAction,
  GET_MY_LISTINGS_TOOL,
  MARK_LISTING_SOLD_TOOL,
  PAUSE_LISTING_TOOL,
  runAccountTool,
  UNPAUSE_LISTING_TOOL,
  UPDATE_LISTING_PRICE_TOOL,
} from './support-tools';
import { buildSystemPrompt } from './system-prompt';
import type {
  InboundWhatsappMessage,
  SupportAgentServiceLike,
} from './support.controller';

/**
 * A single message in the format the model expects: Anthropic's Messages
 * API role vocabulary ('user' | 'assistant'), not the SupportMessage.role
 * storage vocabulary ('inbound' | 'agent').
 */
export type SupportModelMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Small abstraction over "call an LLM and get a reply back" so
 * SupportAgentService never talks to the network directly. Tests inject a
 * fake; support.module.ts wires the real Anthropic-backed implementation
 * below under the SUPPORT_MODEL_CLIENT token.
 */
export interface SupportModelClient {
  generateReply(input: {
    system: string;
    messages: SupportModelMessage[];
    tools?: SupportModelToolDefinition[];
  }): Promise<SupportModelReply>;
}

/**
 * A Claude tool definition, in the shape the Anthropic Messages API expects
 * (see https://docs.anthropic.com/en/docs/build-with-claude/tool-use). Kept
 * minimal and provider-shaped rather than wrapped, since the real
 * AnthropicSupportModelClient forwards these to the API as-is.
 */
export type SupportModelToolDefinition = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

/** The model chose to reply with plain text — the common case. */
export type SupportModelTextReply = {
  type: 'text';
  text: string;
};

/**
 * The model chose to invoke a tool instead of replying directly.
 *
 * `escalate` (Task 8) stays single-shot: SupportAgentService executes it and
 * answers with a fixed, deterministic reply — there is no round-trip back to
 * the model for it. Account tools (Task 9 — see ACCOUNT_TOOL_NAMES in
 * support-tools.ts, e.g. `getMyListings`) are proper multi-turn tool use:
 * the tool is executed server-side, its result is appended to the message
 * history as a tool_result, and the model is called AGAIN so it can turn
 * that data into a customer-facing reply.
 */
export type SupportModelToolUseReply = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type SupportModelReply = SupportModelTextReply | SupportModelToolUseReply;

/**
 * The `escalate` tool: lets the model hand an unresolved conversation off to
 * a human by email rather than guessing or stonewalling. Registered as the
 * FIRST tool in the list passed to the model (see handleInboundMessage
 * below) — Tasks 9-10 append more tools after it.
 */
export const ESCALATE_TOOL: SupportModelToolDefinition = {
  description:
    "Escalate this WhatsApp conversation to a human Zwibba support agent by email, because you cannot resolve the customer's issue yourself (e.g. it needs manual account changes, a dispute, or falls outside what you can help with). Use this instead of guessing or repeating yourself.",
  input_schema: {
    properties: {
      reason: {
        description:
          'Short machine-readable reason code for the escalation, e.g. "unresolved_billing_issue".',
        type: 'string',
      },
      summary: {
        description:
          "Concise summary, in the customer's own language, of their issue and what has already been tried.",
        type: 'string',
      },
    },
    required: ['reason', 'summary'],
    type: 'object',
  },
  name: 'escalate',
};

/**
 * Sent to the customer immediately after an `escalate` tool call, instead of
 * asking the model for a second turn: the reply is fixed and deterministic
 * regardless of whether the escalation email actually sent (see
 * SupportEscalationService — email failures are logged, never surfaced to
 * the customer). Bilingual (French / English) to match RATE_LIMIT_NOTICE
 * below and the rest of the agent's bilingual system messages.
 */
export const ESCALATION_REPLY =
  "Merci pour votre message. Notre équipe vous recontacte par email. / Thank you for your message. Our team will contact you by email.";

export const SUPPORT_MODEL_CLIENT = 'SupportModelClient';
export const SUPPORT_AGENT_RATE_LIMIT = 'SupportAgentRateLimit';
export const SUPPORT_PENDING_ACTION_TTL = 'SupportPendingActionTtl';

export type SupportAgentRateLimitConfig = {
  /** Size of the sliding window, in milliseconds, used to count inbound messages. */
  windowMs: number;
  /** Inbound messages from the same waId within the window above this count skip the Claude call. */
  maxInboundPerWindow: number;
};

export const DEFAULT_SUPPORT_AGENT_RATE_LIMIT: SupportAgentRateLimitConfig = {
  windowMs: 60_000,
  maxInboundPerWindow: 5,
};

// How many prior messages (inbound + agent, combined) are loaded as context
// for each Claude call.
const CONTEXT_MESSAGE_LIMIT = 10;

// Hard ceiling on how many tool_use round-trips a single inbound message can
// trigger. Guards against a misbehaving/looping model repeatedly calling an
// account tool instead of ever producing a text reply — without this, such a
// loop would call the (paid) model API and the DB unboundedly.
const MAX_TOOL_TURNS = 3;

const RATE_LIMIT_NOTICE =
  'Vous nous avez envoyé beaucoup de messages en peu de temps. Merci de patienter un instant avant de réessayer. / You have sent a lot of messages in a short time — please wait a moment before trying again.';

/**
 * How long a pending, awaiting-confirmation account action stays valid before
 * a "OUI" can no longer execute it (FIX: stale-confirm). 15 minutes: long
 * enough for a real customer to read a confirmation prompt and reply, short
 * enough that a confirmation typed hours later against a long-forgotten prompt
 * (or one left over across a support session) can never mutate anything.
 * Overridable per-instance via SUPPORT_PENDING_ACTION_TTL for tests.
 */
export const PENDING_ACTION_TTL_MS = 15 * 60_000;

/**
 * Sent when a customer confirms ("OUI") an action whose pending prompt has
 * already expired (older than PENDING_ACTION_TTL_MS). The pending action is
 * cleared and NOTHING is mutated. Bilingual, like the other agent notices.
 */
export const PENDING_ACTION_EXPIRED_REPLY =
  "Cette demande a expiré. Aucune modification n'a été faite — merci de refaire votre demande si besoin. / This request has expired. Nothing was changed — please make your request again if you still need it.";

/**
 * Fixed, deterministic apology sent when the model call (or the whole
 * model-driven turn) throws — a transient outage must never drop the customer
 * or 500 the webhook. Bilingual.
 */
export const MODEL_ERROR_REPLY =
  "Désolé, un problème technique temporaire nous empêche de répondre à l'instant. Merci de réessayer dans un moment. / Sorry, a temporary technical problem is preventing us from replying right now. Please try again in a moment.";

/** Detects a Prisma unique-constraint violation (P2002) without importing the client. */
function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

/**
 * True when a stored pending action is too old to still be confirmable, OR
 * when its freshness cannot be established at all (missing/unparseable
 * createdAt) — the conservative choice, since a pending action minted by
 * requestMutatingAction always carries a valid ISO createdAt.
 */
function isPendingActionExpired(raw: unknown, nowMs: number, ttlMs: number): boolean {
  if (!raw || typeof raw !== 'object') {
    return true;
  }

  const createdAt = (raw as { createdAt?: unknown }).createdAt;

  if (typeof createdAt !== 'string') {
    return true;
  }

  const createdMs = Date.parse(createdAt);

  if (Number.isNaN(createdMs)) {
    return true;
  }

  return nowMs - createdMs > ttlMs;
}

// Matches a bare confirmation reply ("OUI", "OK", "yes", with minor trailing
// punctuation) and NOTHING else — deliberately strict (anchored, whole
// string) so a longer message that merely contains "oui" somewhere never
// accidentally confirms a pending action.
const CONFIRMATION_TEXT_PATTERN = /^\s*(oui|ok|okay|yes)\s*[!.]?\s*$/i;

function isConfirmationText(text: string): boolean {
  return CONFIRMATION_TEXT_PATTERN.test(text);
}

/**
 * @internal exported only for support.module.ts to type its own env access.
 */
export type SupportModelEnv = {
  support: {
    claudeApiKey?: string;
    claudeModel?: string;
  };
};

type AnthropicSupportModelClientOptions = {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
};

/**
 * Real SupportModelClient implementation. `@anthropic-ai/sdk` is not a
 * dependency of this project (see apps/api/src/ai/anthropic-vision-draft-provider.ts,
 * which follows the same pattern), so this calls the Anthropic Messages API
 * directly over `fetch` rather than adding a new dependency.
 *
 * apiKey/model are optional at construction time (mirroring how
 * SupportReplySender treats its own `meta` config as optional) so that
 * wiring this up in support.module.ts never fails app boot just because
 * ANTHROPIC_API_KEY / ANTHROPIC_MODEL are unset; missing config only
 * surfaces when a reply is actually requested.
 */
export class AnthropicSupportModelClient implements SupportModelClient {
  #apiKey?: string;
  #model?: string;
  #fetchFn: typeof fetch;

  constructor({ apiKey, model, fetchFn = fetch }: AnthropicSupportModelClientOptions) {
    this.#apiKey = apiKey;
    this.#model = model;
    this.#fetchFn = fetchFn;
  }

  async generateReply({
    system,
    messages,
    tools,
  }: {
    system: string;
    messages: SupportModelMessage[];
    tools?: SupportModelToolDefinition[];
  }): Promise<SupportModelReply> {
    if (!this.#apiKey || !this.#model) {
      throw new Error(
        'Anthropic support model is not configured (missing ANTHROPIC_API_KEY / ANTHROPIC_MODEL).',
      );
    }

    const response = await this.#fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'x-api-key': this.#apiKey,
      },
      body: JSON.stringify({
        max_tokens: 1024,
        messages: messages.map((message) => ({
          content: message.content,
          role: message.role,
        })),
        model: this.#model,
        system,
        ...(tools && tools.length > 0 ? { tools } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic support request failed with status ${response.status}.`);
    }

    const responseJson = (await response.json()) as Record<string, unknown>;
    const content = Array.isArray(responseJson.content) ? responseJson.content : [];

    const toolUseBlock = content.find(
      (block): block is Record<string, unknown> =>
        !!block && typeof block === 'object' && (block as Record<string, unknown>).type === 'tool_use',
    );

    if (toolUseBlock) {
      return {
        id: typeof toolUseBlock.id === 'string' ? toolUseBlock.id : '',
        input:
          toolUseBlock.input && typeof toolUseBlock.input === 'object'
            ? (toolUseBlock.input as Record<string, unknown>)
            : {},
        name: typeof toolUseBlock.name === 'string' ? toolUseBlock.name : '',
        type: 'tool_use',
      };
    }

    const textBlock = content.find(
      (block): block is Record<string, unknown> =>
        !!block && typeof block === 'object' && (block as Record<string, unknown>).type === 'text',
    );
    const text = typeof textBlock?.text === 'string' ? textBlock.text : '';

    return { text: text.trim(), type: 'text' };
  }
}

/**
 * Handles an inbound WhatsApp text message end to end: persists it, loads
 * recent context, asks Claude for a reply (unless the sender is
 * rate-limited), sends the reply back over WhatsApp, and persists it.
 *
 * As of Task 8, Claude is offered one tool (`escalate` — see ESCALATE_TOOL
 * above). This is a minimal tool-use turn, not a full agentic loop: a
 * tool_use response is executed and answered with a fixed reply rather than
 * being fed back to the model for a second turn. Tasks 9-10 add more tools
 * (self-only reads, confirmed reversible actions) on top of this same shape.
 */
@Injectable()
export class SupportAgentService implements SupportAgentServiceLike {
  private readonly rateLimit: SupportAgentRateLimitConfig;
  private readonly pendingActionTtlMs: number;

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(SUPPORT_MODEL_CLIENT) private readonly modelClient: SupportModelClient,
    @Inject(SupportReplySender) private readonly replySender: SupportReplySender,
    @Inject(SupportEscalationService) private readonly escalationService: SupportEscalationService,
    @Optional()
    @Inject(SUPPORT_AGENT_RATE_LIMIT)
    rateLimit?: SupportAgentRateLimitConfig,
    @Optional()
    @Inject(SUPPORT_PENDING_ACTION_TTL)
    pendingActionTtlMs?: number,
  ) {
    this.rateLimit = rateLimit ?? DEFAULT_SUPPORT_AGENT_RATE_LIMIT;
    this.pendingActionTtlMs =
      typeof pendingActionTtlMs === 'number' ? pendingActionTtlMs : PENDING_ACTION_TTL_MS;
  }

  /** Sends a WhatsApp reply, swallowing+logging any send failure (never throws). */
  private async safeSendText(waId: string, body: string): Promise<void> {
    try {
      const result = await this.replySender.sendText(waId, body);

      // FIX (silent send failures): SupportReplySender.sendText resolves `null`
      // on a non-2xx WhatsApp Cloud API response instead of throwing, so a
      // failed send would otherwise be swallowed here with no trace. Surface
      // it as a warning (still non-throwing) so a broken outbound path is at
      // least visible in the logs.
      if (!result) {
        // eslint-disable-next-line no-console
        console.warn(`[support] WhatsApp reply send reported no result (send may have failed) for waId ${waId}.`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[support] Failed to send a WhatsApp reply.', error);
    }
  }

  /** Persists an outbound agent reply. Agent replies carry no waMessageId. */
  private async persistAgentReply(conversationId: string, body: string): Promise<void> {
    await this.prismaService.supportMessage.create({
      data: {
        body,
        conversationId,
        role: 'agent',
      },
    });
  }

  async handleInboundMessage({ waId, text, messageId }: InboundWhatsappMessage): Promise<void> {
    const now = new Date();

    // FIX (idempotency): Meta delivers webhooks at-least-once. If we have
    // already stored a SupportMessage for this exact provider messageId, this
    // is a replay — skip it entirely: no duplicate row, no duplicate model
    // call, no duplicate reply.
    if (messageId) {
      const alreadyProcessed = await this.prismaService.supportMessage.findUnique({
        where: { waMessageId: messageId },
      });

      if (alreadyProcessed) {
        return;
      }
    }

    const conversation = await this.prismaService.supportConversation.upsert({
      create: {
        lastInboundAt: now,
        waId,
      },
      update: {
        lastInboundAt: now,
      },
      where: { waId },
    });

    // FIX (idempotency race): two concurrent deliveries of the same messageId
    // can both pass the pre-check above before either insert lands. The unique
    // index on waMessageId makes the loser's insert fail with P2002 — treat
    // that as "already processed" and stop, so the message is handled once.
    try {
      await this.prismaService.supportMessage.create({
        data: {
          body: text,
          conversationId: conversation.id,
          role: 'inbound',
          waMessageId: messageId ?? null,
        },
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return;
      }
      throw error;
    }

    const windowStart = new Date(now.getTime() - this.rateLimit.windowMs);
    const recentInboundCount = await this.prismaService.supportMessage.count({
      where: {
        conversationId: conversation.id,
        createdAt: { gte: windowStart },
        role: 'inbound',
      },
    });

    if (recentInboundCount > this.rateLimit.maxInboundPerWindow) {
      await this.safeSendText(waId, RATE_LIMIT_NOTICE);
      return;
    }

    // Confirmed-action short-circuit (Task 10): if this conversation has a
    // reversible action awaiting confirmation, the SAME wa_id's very next
    // message decides its fate deterministically — WITHOUT ever calling the
    // model. This is what makes the confirmation step immune to the model
    // regenerating (or being prompt-injected into regenerating) a different
    // tool call: the executed action is always exactly the one stored in
    // step 1, never something re-derived from this turn's text.
    if (conversation.pendingActionJson) {
      const pendingActionJson = conversation.pendingActionJson;
      // Capture the nonce that was minted alongside THIS pending action so the
      // consume below can match it exactly (see FIX note on the updateMany).
      const pendingActionNonce = conversation.pendingActionNonce;

      if (isConfirmationText(text)) {
        // FIX (nonce-scoped atomic consume + replay protection): the pending
        // action is cleared with a CONDITIONAL updateMany matched on the EXACT
        // nonce captured above — not on the broad `pendingActionJson != null`
        // predicate used before. That broad predicate was too loose: if a NEW
        // pending action (with a NEW nonce) was written between this
        // confirming request's read and its updateMany, the old broad clear
        // would flip the NEW pending action to null and then execute the OLD
        // captured payload — the wrong mutation. Matching on the captured
        // nonce guarantees a request that read P1(nonce n1) can only ever
        // clear/execute P1: once the row holds P2(nonce n2), this updateMany
        // matches nothing (count===0) and executes nothing. Under a race of
        // two identical "OUI" deliveries on the SAME pending action, exactly
        // one flips it and gets count===1; the other sees count===0.
        const consumed = await this.prismaService.supportConversation.updateMany({
          where: { id: conversation.id, pendingActionNonce },
          data: { pendingActionJson: null, pendingActionNonce: null },
        });

        if (consumed.count !== 1) {
          // Another turn already consumed this pending action — benign no-op.
          return;
        }

        // FIX (TTL / stale confirm): only execute if the pending action is
        // still fresh. An expired one is already cleared (above) and mutates
        // nothing; the customer is told the request expired.
        if (isPendingActionExpired(pendingActionJson, now.getTime(), this.pendingActionTtlMs)) {
          await this.safeSendText(waId, PENDING_ACTION_EXPIRED_REPLY);
          await this.persistAgentReply(conversation.id, PENDING_ACTION_EXPIRED_REPLY);
          return;
        }

        const result = await executePendingAction(this.prismaService, waId, pendingActionJson);

        await this.safeSendText(waId, result.replyText);
        await this.persistAgentReply(conversation.id, result.replyText);

        return;
      }

      // Not a confirmation: invalidate the pending action (same atomic,
      // nonce-scoped clear) and fall through to the normal model-driven flow.
      // A customer who changes their mind, or a stale prompt left over from a
      // much earlier turn, can never be confirmed by an unrelated later "OUI".
      // Scoping on the captured nonce means a NEWER pending action written
      // concurrently is never clobbered by this clear.
      await this.prismaService.supportConversation.updateMany({
        where: { id: conversation.id, pendingActionNonce },
        data: { pendingActionJson: null, pendingActionNonce: null },
      });
    }

    const history = await this.prismaService.supportMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: CONTEXT_MESSAGE_LIMIT,
      where: { conversationId: conversation.id },
    });

    const contextMessages: SupportModelMessage[] = history
      .slice()
      .reverse()
      .map((message) => ({
        content: message.body,
        role: message.role === 'agent' ? 'assistant' : 'user',
      }));

    const system = buildSystemPrompt();
    const tools = [
      ESCALATE_TOOL,
      GET_MY_LISTINGS_TOOL,
      PAUSE_LISTING_TOOL,
      UNPAUSE_LISTING_TOOL,
      MARK_LISTING_SOLD_TOOL,
      UPDATE_LISTING_PRICE_TOOL,
    ];

    let trimmedReply = '';

    // FIX (error handling): the entire model-driven turn — every
    // generateReply call AND the server-side tool executions between them — is
    // wrapped so a transient model outage (or any throw in the loop) never
    // 500s the webhook or drops the customer. On failure we send a fixed
    // bilingual apology instead of a model reply; even that send is
    // best-effort (safeSendText never throws), so the turn always resolves.
    try {
      let messages = contextMessages;
      let reply = await this.modelClient.generateReply({ messages, system, tools });

      let toolTurns = 0;

      // Multi-turn tool loop: `escalate` (Task 8) stays single-shot — it has a
      // fixed, deterministic reply, so handling it never re-calls the model.
      // Account tools (Task 9, e.g. `getMyListings` — see ACCOUNT_TOOL_NAMES
      // in support-tools.ts) are executed server-side and their result is fed
      // back to the model for a genuine second turn, so it can turn raw
      // account data into a customer-facing reply.
      while (reply.type === 'tool_use' && toolTurns < MAX_TOOL_TURNS) {
        toolTurns += 1;

        if (reply.name === 'escalate') {
          const toolInput = reply.input as { reason?: unknown; summary?: unknown };
          const reason = typeof toolInput.reason === 'string' ? toolInput.reason : 'unspecified';
          const summary = typeof toolInput.summary === 'string' ? toolInput.summary : '';

          // The email send/audit outcome is deliberately not awaited into this
          // branch's control flow beyond `await` itself: escalate() never
          // throws and always resolves a boolean, so success or failure of the
          // email never changes what the customer sees below.
          await this.escalationService.escalate({
            history: messages,
            reason,
            summary,
            waId,
          });

          trimmedReply = ESCALATION_REPLY;
          break;
        }

        if (!ACCOUNT_TOOL_NAMES.has(reply.name)) {
          // Unrecognized tool name: stop rather than guess, and never forward
          // a tool_use payload to the customer as if it were a reply.
          break;
        }

        // SECURITY: `waId` here is the webhook-verified sender from the
        // signature-checked payload (see support.controller.ts) — never
        // anything derived from `reply.input` or the message text.
        // runAccountTool (support-tools.ts) re-resolves the authorized
        // account from `waId` alone on every call, so a model that was
        // prompt-injected into asking for another number's data still only
        // ever gets this sender's own account. `reply.input` IS forwarded for
        // mutating tools (e.g. the target listingId, a new price) — but it is
        // only ever used to pick WHICH of the sender's OWN listings to act on,
        // re-verified against `waId`-derived ownership; it can never widen
        // whose data or account is touched.
        const toolResultText = await runAccountTool(
          this.prismaService,
          reply.name,
          waId,
          reply.input,
          conversation.id,
        );

        messages = [
          ...messages,
          {
            content: JSON.stringify({ id: reply.id, input: reply.input, name: reply.name }),
            role: 'assistant',
          },
          {
            content: toolResultText,
            role: 'user',
          },
        ];

        reply = await this.modelClient.generateReply({ messages, system, tools });
      }

      if (reply.type === 'text' && !trimmedReply) {
        trimmedReply = reply.text?.trim() ?? '';
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[support] Support model interaction failed.', error);
      await this.safeSendText(waId, MODEL_ERROR_REPLY);
      return;
    }

    if (!trimmedReply) {
      return;
    }

    await this.safeSendText(waId, trimmedReply);
    await this.persistAgentReply(conversation.id, trimmedReply);
  }
}

/**
 * Builds the real, network-backed SupportModelClient from process env.
 * Kept as a small factory (rather than inline in support.module.ts) so the
 * module file stays a thin wiring layer.
 */
export function createAnthropicSupportModelClient(
  env: SupportModelEnv = loadEnv() as unknown as SupportModelEnv,
): AnthropicSupportModelClient {
  return new AnthropicSupportModelClient({
    apiKey: env.support.claudeApiKey,
    model: env.support.claudeModel,
  });
}
