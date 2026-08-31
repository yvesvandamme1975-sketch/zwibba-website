import { Inject, Injectable, Optional } from '@nestjs/common';

import { loadEnv } from '../config/env';

type FetchFn = typeof fetch;

type SupportReplySenderEnv = {
  // Support-scoped WhatsApp Graph config (see env.ts `support.whatsapp*`),
  // read from META_WHATSAPP_* independently of OTP_PROVIDER. Deliberately NOT
  // `env.meta` (the OTP-scoped config, only present when OTP_PROVIDER='meta')
  // so the support agent can reply regardless of the OTP mechanism in use.
  support: {
    whatsappAccessToken?: string;
    whatsappGraphApiVersion?: string;
    whatsappPhoneNumberId?: string;
  };
};

export const SUPPORT_REPLY_FETCH = 'SupportReplyFetch';
export const SUPPORT_REPLY_ENV = 'SupportReplyEnv';

@Injectable()
export class SupportReplySender {
  private readonly env: SupportReplySenderEnv;
  private readonly fetchFn: FetchFn;

  constructor(
    @Optional()
    @Inject(SUPPORT_REPLY_ENV)
    env?: SupportReplySenderEnv,
    @Optional()
    @Inject(SUPPORT_REPLY_FETCH)
    fetchFn?: FetchFn,
  ) {
    this.env = env ?? (loadEnv() as unknown as SupportReplySenderEnv);
    this.fetchFn = fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  async sendText(waId: string, body: string): Promise<{ messageId: string } | null> {
    if (!body || !body.trim()) {
      return null;
    }

    const { whatsappAccessToken, whatsappGraphApiVersion, whatsappPhoneNumberId } =
      this.env.support;

    if (!whatsappAccessToken || !whatsappGraphApiVersion || !whatsappPhoneNumberId) {
      throw new Error('WhatsApp Cloud API is not configured for support replies.');
    }

    const graphApiVersion = whatsappGraphApiVersion.replace(/^v/i, '');
    const response = await this.fetchFn(
      `https://graph.facebook.com/v${graphApiVersion}/${whatsappPhoneNumberId}/messages`,
      {
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          text: {
            body,
          },
          to: waId,
          type: 'text',
        }),
        headers: {
          authorization: `Bearer ${whatsappAccessToken}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      messages?: Array<{ id: string }>;
    };
    const messageId = payload.messages?.[0]?.id;

    return messageId ? { messageId } : null;
  }
}
