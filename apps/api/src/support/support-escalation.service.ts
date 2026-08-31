import { Inject, Injectable, Optional } from '@nestjs/common';

import { loadEnv } from '../config/env';
import { PrismaService } from '../database/prisma.service';

/**
 * A single message in the "who said what" shape used to render escalation
 * emails. Deliberately looser than SupportModelMessage (support-agent.service.ts)
 * so this file has no compile-time dependency on the agent module — only
 * support-agent.service.ts depends on this one, never the other way around.
 */
export type SupportEscalationHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Small abstraction over "send a transactional email" so
 * SupportEscalationService never talks to a specific provider directly.
 * Tests inject a fake; support.module.ts wires the real, fetch-backed
 * implementation below under the SUPPORT_EMAIL_SENDER token.
 */
export interface SupportEmailSender {
  sendEmail(input: { to: string; subject: string; body: string }): Promise<boolean>;
}

export const SUPPORT_EMAIL_SENDER = 'SupportEmailSender';
export const SUPPORT_ESCALATION_ENV = 'SupportEscalationEnv';

/**
 * @internal exported only for support.module.ts to type its own env access.
 */
export type SupportEscalationEnv = {
  support: {
    escalationEmail: string;
    emailProviderApiKey?: string;
  };
};

type HttpSupportEmailSenderOptions = {
  apiKey?: string;
  fromAddress?: string;
  apiUrl?: string;
  fetchFn?: typeof fetch;
  logger?: Pick<Console, 'warn' | 'error'>;
};

// Shaped like Resend's simple transactional-email endpoint (POST { from, to,
// subject, text } -> 2xx), chosen because it needs no SDK and a single API
// key — but nothing here depends on Resend specifically: apiUrl/fromAddress
// are constructor options, so swapping providers later is a config change,
// not a code change.
const DEFAULT_EMAIL_API_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM_ADDRESS = 'Zwibba Support <support@zwibba.app>';

/**
 * Minimal, provider-agnostic transactional email client over `fetch`.
 *
 * Zwibba has no other email-sending infrastructure yet (there is no
 * nodemailer/Resend/SendGrid/SMTP anywhere else in apps/api/src), so this is
 * the smallest one that unblocks WhatsApp support escalation: no new SDK
 * dependency, one HTTP call, entirely gated by SUPPORT_EMAIL_API_KEY.
 *
 * Critically: when no API key is configured, `sendEmail` logs a warning and
 * resolves `false` — it never throws. An unconfigured escalation channel
 * must not be able to crash the support agent or block the customer from
 * getting a reply (mirrors how AnthropicSupportModelClient and
 * SupportReplySender treat their own optional config lazily rather than at
 * boot).
 */
export class HttpSupportEmailSender implements SupportEmailSender {
  #apiKey?: string;
  #fromAddress: string;
  #apiUrl: string;
  #fetchFn: typeof fetch;
  #logger: Pick<Console, 'warn' | 'error'>;

  constructor({
    apiKey,
    fromAddress = DEFAULT_FROM_ADDRESS,
    apiUrl = DEFAULT_EMAIL_API_URL,
    fetchFn = fetch,
    logger = console,
  }: HttpSupportEmailSenderOptions = {}) {
    this.#apiKey = apiKey;
    this.#fromAddress = fromAddress;
    this.#apiUrl = apiUrl;
    this.#fetchFn = fetchFn;
    this.#logger = logger;
  }

  async sendEmail({
    to,
    subject,
    body,
  }: {
    to: string;
    subject: string;
    body: string;
  }): Promise<boolean> {
    if (!this.#apiKey) {
      this.#logger.warn(
        '[support] Escalation email skipped: SUPPORT_EMAIL_API_KEY is not configured.',
      );
      return false;
    }

    try {
      const response = await this.#fetchFn(this.#apiUrl, {
        body: JSON.stringify({
          from: this.#fromAddress,
          subject,
          text: body,
          to: [to],
        }),
        headers: {
          authorization: `Bearer ${this.#apiKey}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      });

      if (!response.ok) {
        this.#logger.error(`[support] Escalation email failed with status ${response.status}.`);
        return false;
      }

      return true;
    } catch (error) {
      this.#logger.error('[support] Escalation email request threw.', error);
      return false;
    }
  }
}

export type SupportEscalationInput = {
  waId: string;
  reason: string;
  summary: string;
  history: SupportEscalationHistoryMessage[];
};

function formatHistory(history: SupportEscalationHistoryMessage[]): string {
  if (history.length === 0) {
    return '(no recent conversation history)';
  }

  return history
    .map((message) => `${message.role === 'assistant' ? 'Zwibba' : 'Client'}: ${message.content}`)
    .join('\n');
}

/**
 * Escalates a WhatsApp support conversation to a human by email.
 *
 * Always returns a boolean, never throws: both the email send and the audit
 * log write are wrapped so a misconfigured or unreachable email provider (or
 * a DB hiccup on the audit write) can never propagate up into
 * SupportAgentService and crash the agent mid-conversation. The caller
 * (SupportAgentService) uses the graceful "our team will contact you by
 * email" reply regardless of the outcome — the customer is never shown
 * whether the email actually went out.
 */
@Injectable()
export class SupportEscalationService {
  private readonly env: SupportEscalationEnv;

  constructor(
    @Inject(SUPPORT_EMAIL_SENDER) private readonly emailSender: SupportEmailSender,
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Optional()
    @Inject(SUPPORT_ESCALATION_ENV)
    env?: SupportEscalationEnv,
  ) {
    this.env = env ?? (loadEnv() as unknown as SupportEscalationEnv);
  }

  async escalate({ waId, reason, summary, history }: SupportEscalationInput): Promise<boolean> {
    const to = this.env.support.escalationEmail;
    const subject = `Zwibba support escalation — ${waId}`;
    const body = [
      `WhatsApp: ${waId}`,
      `Reason: ${reason}`,
      `Summary: ${summary}`,
      '',
      'Recent conversation:',
      formatHistory(history),
    ].join('\n');

    let sent = false;

    try {
      sent = await this.emailSender.sendEmail({ body, subject, to });
    } catch (error) {
      sent = false;
      console.error('[support] Escalation email sender threw.', error);
    }

    try {
      await this.prismaService.supportActionLog.create({
        data: {
          action: 'escalate',
          outcome: sent ? 'sent' : 'failed',
          payloadJson: { reason, summary },
          waId,
        },
      });
    } catch (error) {
      // Audit logging is best-effort: never let it block the graceful reply
      // the customer is about to receive.
      console.error('[support] Failed to persist escalation audit log.', error);
    }

    return sent;
  }
}

/**
 * Builds the real, network-backed SupportEmailSender from process env.
 * Kept as a small factory (rather than inline in support.module.ts) so the
 * module file stays a thin wiring layer, mirroring
 * createAnthropicSupportModelClient in support-agent.service.ts.
 */
export function createHttpSupportEmailSender(
  env: SupportEscalationEnv = loadEnv() as unknown as SupportEscalationEnv,
): HttpSupportEmailSender {
  return new HttpSupportEmailSender({ apiKey: env.support.emailProviderApiKey });
}
