import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Inject,
  Optional,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { loadEnv } from '../config/env';

export type InboundWhatsappMessage = {
  waId: string;
  text: string;
  messageId: string;
};

/**
 * Shape of the agent service that handles inbound WhatsApp messages once
 * they have been authenticated and parsed. Task 7 supplies the real
 * implementation under the SUPPORT_AGENT_SERVICE token; this controller only
 * depends on the interface so it never needs to change when that lands.
 */
export interface SupportAgentServiceLike {
  handleInboundMessage(message: InboundWhatsappMessage): Promise<void> | void;
}

export const SUPPORT_AGENT_SERVICE = 'SupportAgentService';
export const SUPPORT_WEBHOOK_ENV = 'SupportWebhookEnv';

type SupportWebhookEnv = {
  support: {
    whatsappVerifyToken?: string;
    metaAppSecret?: string;
  };
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          id?: string;
          type?: string;
          text?: {
            body?: string;
          };
        }>;
      };
    }>;
  }>;
};

function extractInboundTextMessages(payload: unknown): InboundWhatsappMessage[] {
  const messages: InboundWhatsappMessage[] = [];

  if (!payload || typeof payload !== 'object') {
    return messages;
  }

  // Meta's payload nesting (entry[] -> changes[] -> value.messages[]) is
  // guarded with Array.isArray at every level: a validly-signed but malformed
  // shape (e.g. {"entry":{}}, or a non-array `messages`) must be ignored and
  // yield an empty list, never throw a TypeError that would 500 the webhook.
  const rawEntries = (payload as WhatsAppWebhookPayload).entry;
  const entries = Array.isArray(rawEntries) ? rawEntries : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const inbound = Array.isArray(change?.value?.messages) ? change.value.messages : [];
      for (const message of inbound) {
        if (message?.type === 'text' && message.from && message.id && message.text?.body) {
          messages.push({
            waId: message.from,
            text: message.text.body,
            messageId: message.id,
          });
        }
      }
    }
  }

  return messages;
}

function isValidSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  secret: string | undefined,
): boolean {
  if (!rawBody || rawBody.length === 0 || !signatureHeader || !secret) {
    return false;
  }

  const prefix = 'sha256=';

  if (!signatureHeader.startsWith(prefix)) {
    return false;
  }

  const providedHex = signatureHeader.slice(prefix.length).trim();
  const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex');

  let providedBuffer: Buffer;
  let expectedBuffer: Buffer;

  try {
    providedBuffer = Buffer.from(providedHex, 'hex');
    expectedBuffer = Buffer.from(expectedHex, 'hex');
  } catch {
    return false;
  }

  if (providedBuffer.length === 0 || providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

@Controller('support/whatsapp')
export class SupportController {
  private readonly env: SupportWebhookEnv;

  constructor(
    @Inject(SUPPORT_AGENT_SERVICE)
    private readonly supportAgentService: SupportAgentServiceLike,
    @Optional()
    @Inject(SUPPORT_WEBHOOK_ENV)
    env?: SupportWebhookEnv,
  ) {
    this.env = env ?? (loadEnv() as unknown as SupportWebhookEnv);
  }

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') verifyToken?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    const expectedToken = this.env.support.whatsappVerifyToken;

    if (mode === 'subscribe' && !!expectedToken && verifyToken === expectedToken) {
      // Returning a primitive (not an object) makes Nest send the raw value
      // as-is, rather than JSON-serializing it — Meta expects the bare
      // challenge string back, not `{"challenge":"..."}`.
      return challenge ?? '';
    }

    throw new ForbiddenException();
  }

  @Post('webhook')
  @HttpCode(200)
  async receiveWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('x-hub-signature-256') signatureHeader: string | undefined,
    @Body() body: unknown,
  ) {
    const secret = this.env.support.metaAppSecret;

    if (!isValidSignature(req.rawBody, signatureHeader, secret)) {
      throw new UnauthorizedException();
    }

    const messages = extractInboundTextMessages(body);

    // The signature has been verified, so this is a durable, authentic receipt:
    // ALWAYS return 200. Each message is handled in its own try/catch so a
    // single downstream failure can neither abort the rest of the batch nor
    // turn a validly-signed webhook into a 500 (which would make Meta retry the
    // whole batch). Per-message errors are logged; the agent path itself is
    // hardened to reply gracefully rather than throw (see SupportAgentService).
    for (const message of messages) {
      try {
        await this.supportAgentService.handleInboundMessage(message);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[support] Failed to handle an inbound WhatsApp message.', error);
      }
    }

    return { received: true };
  }
}
