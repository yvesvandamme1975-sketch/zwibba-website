import { Inject, Injectable, Optional } from '@nestjs/common';

import { loadEnv } from '../config/env';
import { PrismaService } from '../database/prisma.service';
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
  }): Promise<string>;
}

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
  }: {
    system: string;
    messages: SupportModelMessage[];
  }): Promise<string> {
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
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic support request failed with status ${response.status}.`);
    }

    const responseJson = (await response.json()) as Record<string, unknown>;
    const content = Array.isArray(responseJson.content) ? responseJson.content : [];
    const text =
      typeof (content[0] as Record<string, unknown>)?.text === 'string'
        ? String((content[0] as Record<string, unknown>).text)
        : '';

    return text.trim();
  }
}

/**
 * Handles an inbound WhatsApp text message end to end: persists it, loads
 * recent context, asks Claude for a reply (unless the sender is
 * rate-limited), sends the reply back over WhatsApp, and persists it.
 *
 * No tools yet (see Task 8+ in the implementation plan) — this is the plain
 * conversational loop.
 */
@Injectable()
export class SupportAgentService implements SupportAgentServiceLike {
  private readonly rateLimit: SupportAgentRateLimitConfig;

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(SUPPORT_MODEL_CLIENT) private readonly modelClient: SupportModelClient,
    @Inject(SupportReplySender) private readonly replySender: SupportReplySender,
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
    });

    const trimmedReply = reply?.trim();

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
