import { Inject, Injectable, Optional } from '@nestjs/common';

import { loadEnv } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { SupportEscalationService } from './support-escalation.service';
import { SupportReplySender } from './support-reply.sender';
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
 * The model chose to invoke a tool instead of replying directly. This is the
 * minimal tool-use turn: SupportAgentService executes the tool and decides
 * what (if anything) to send back to the customer — there is no second
 * round-trip back to the model in Task 8, since the only tool (`escalate`)
 * has a fixed, deterministic reply. Tasks 9-10 add read/action tools on top
 * of this same shape.
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

const RATE_LIMIT_NOTICE =
  'Vous nous avez envoyé beaucoup de messages en peu de temps. Merci de patienter un instant avant de réessayer. / You have sent a lot of messages in a short time — please wait a moment before trying again.';

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

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(SUPPORT_MODEL_CLIENT) private readonly modelClient: SupportModelClient,
    @Inject(SupportReplySender) private readonly replySender: SupportReplySender,
    @Inject(SupportEscalationService) private readonly escalationService: SupportEscalationService,
    @Optional()
    @Inject(SUPPORT_AGENT_RATE_LIMIT)
    rateLimit?: SupportAgentRateLimitConfig,
  ) {
    this.rateLimit = rateLimit ?? DEFAULT_SUPPORT_AGENT_RATE_LIMIT;
  }

  async handleInboundMessage({ waId, text }: InboundWhatsappMessage): Promise<void> {
    const now = new Date();

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

    await this.prismaService.supportMessage.create({
      data: {
        body: text,
        conversationId: conversation.id,
        role: 'inbound',
      },
    });

    const windowStart = new Date(now.getTime() - this.rateLimit.windowMs);
    const recentInboundCount = await this.prismaService.supportMessage.count({
      where: {
        conversationId: conversation.id,
        createdAt: { gte: windowStart },
        role: 'inbound',
      },
    });

    if (recentInboundCount > this.rateLimit.maxInboundPerWindow) {
      await this.replySender.sendText(waId, RATE_LIMIT_NOTICE);
      return;
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

    const reply = await this.modelClient.generateReply({
      messages: contextMessages,
      system: buildSystemPrompt(),
      tools: [ESCALATE_TOOL],
    });

    let trimmedReply: string;

    if (reply.type === 'tool_use' && reply.name === 'escalate') {
      const toolInput = reply.input as { reason?: unknown; summary?: unknown };
      const reason = typeof toolInput.reason === 'string' ? toolInput.reason : 'unspecified';
      const summary = typeof toolInput.summary === 'string' ? toolInput.summary : '';

      // The email send/audit outcome is deliberately not awaited into this
      // branch's control flow beyond `await` itself: escalate() never
      // throws and always resolves a boolean, so success or failure of the
      // email never changes what the customer sees below.
      await this.escalationService.escalate({
        history: contextMessages,
        reason,
        summary,
        waId,
      });

      trimmedReply = ESCALATION_REPLY;
    } else if (reply.type === 'text') {
      trimmedReply = reply.text?.trim() ?? '';
    } else {
      trimmedReply = '';
    }

    if (!trimmedReply) {
      return;
    }

    await this.replySender.sendText(waId, trimmedReply);

    await this.prismaService.supportMessage.create({
      data: {
        body: trimmedReply,
        conversationId: conversation.id,
        role: 'agent',
      },
    });
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
