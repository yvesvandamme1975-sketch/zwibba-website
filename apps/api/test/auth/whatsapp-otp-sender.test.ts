import assert from 'node:assert/strict';
import test from 'node:test';

import { WhatsappOtpSender } from '../../src/auth/whatsapp-otp.sender';

const metaEnv = {
  meta: {
    accessToken: 'meta-access-token',
    graphApiVersion: '20.0',
    phoneNumberId: '1234567890',
    templateLang: 'fr',
    templateName: 'zwibba_auth_code',
  },
};

test('sendAuthenticationCode posts the Meta authentication template payload', async () => {
  const requests: Array<{ body: unknown; headers: HeadersInit; url: string }> = [];
  const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({
      body: JSON.parse(String(init?.body)),
      headers: init?.headers ?? {},
      url: String(url),
    });
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.test' }] }), {
      status: 200,
    });
  };
  const sender = new WhatsappOtpSender(metaEnv, fetchFn);

  await sender.sendAuthenticationCode({
    code: '123456',
    phoneNumber: '+243990000001',
  });

  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].url,
    'https://graph.facebook.com/v20.0/1234567890/messages',
  );
  assert.deepEqual(requests[0].headers, {
    authorization: 'Bearer meta-access-token',
    'content-type': 'application/json',
  });
  assert.deepEqual(requests[0].body, {
    messaging_product: 'whatsapp',
    to: '243990000001',
    type: 'template',
    template: {
      name: 'zwibba_auth_code',
      language: {
        code: 'fr',
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              text: '123456',
              type: 'text',
            },
          ],
        },
        {
          index: '0',
          parameters: [
            {
              text: '123456',
              type: 'text',
            },
          ],
          sub_type: 'url',
          type: 'button',
        },
      ],
    },
  });
});

test('sendAuthenticationCode throws a sanitized error on non-2xx responses', async () => {
  const fetchFn = async () => new Response('bad code 123456', { status: 400 });
  const sender = new WhatsappOtpSender(metaEnv, fetchFn);

  await assert.rejects(
    sender.sendAuthenticationCode({
      code: '123456',
      phoneNumber: '+243990000001',
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /WhatsApp Cloud API/);
      assert.doesNotMatch(error.message, /123456/);
      return true;
    },
  );
});
