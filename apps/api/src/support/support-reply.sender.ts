import { Inject, Injectable, Optional } from '@nestjs/common';

import { loadEnv } from '../config/env';

type FetchFn = typeof fetch;

type SupportReplySenderEnv = {
  meta?: {
    accessToken: string;
    graphApiVersion: string;
    phoneNumberId: string;
    templateLang: string;
    templateName: string;
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

    const meta = this.env.meta;

    if (!meta) {
      throw new Error('WhatsApp Cloud API is not configured.');
    }

    const graphApiVersion = meta.graphApiVersion.replace(/^v/i, '');
    const response = await this.fetchFn(
      `https://graph.facebook.com/v${graphApiVersion}/${meta.phoneNumberId}/messages`,
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
          authorization: `Bearer ${meta.accessToken}`,
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
