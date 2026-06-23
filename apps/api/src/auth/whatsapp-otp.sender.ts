import { Inject, Injectable, Optional } from '@nestjs/common';

import { loadEnv } from '../config/env';

type FetchFn = typeof fetch;

type WhatsappOtpSenderEnv = {
  meta?: {
    accessToken: string;
    graphApiVersion: string;
    phoneNumberId: string;
    templateLang: string;
    templateName: string;
  };
};

export const WHATSAPP_OTP_FETCH = 'WhatsappOtpFetch';
export const WHATSAPP_OTP_ENV = 'WhatsappOtpEnv';

@Injectable()
export class WhatsappOtpSender {
  private readonly env: WhatsappOtpSenderEnv;
  private readonly fetchFn: FetchFn;

  constructor(
    @Optional()
    @Inject(WHATSAPP_OTP_ENV)
    env?: WhatsappOtpSenderEnv,
    @Optional()
    @Inject(WHATSAPP_OTP_FETCH)
    fetchFn?: FetchFn,
  ) {
    this.env = env ?? (loadEnv() as unknown as WhatsappOtpSenderEnv);
    this.fetchFn = fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  async sendAuthenticationCode({
    code,
    phoneNumber,
  }: {
    code: string;
    phoneNumber: string;
  }) {
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
          template: {
            components: [
              {
                parameters: [
                  {
                    text: code,
                    type: 'text',
                  },
                ],
                type: 'body',
              },
              {
                index: '0',
                parameters: [
                  {
                    coupon_code: code,
                    type: 'coupon_code',
                  },
                ],
                sub_type: 'copy_code',
                type: 'button',
              },
            ],
            language: {
              code: meta.templateLang,
            },
            name: meta.templateName,
          },
          to: phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber,
          type: 'template',
        }),
        headers: {
          authorization: `Bearer ${meta.accessToken}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      },
    );

    if (!response.ok) {
      throw new Error(
        `WhatsApp Cloud API rejected the authentication template with status ${response.status}.`,
      );
    }
  }
}
