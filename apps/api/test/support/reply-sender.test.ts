import assert from 'node:assert/strict';
import test from 'node:test';

import { SupportReplySender } from '../../src/support/support-reply.sender';

const metaEnv = {
  meta: {
    accessToken: 'meta-access-token',
    graphApiVersion: '20.0',
    phoneNumberId: '1234567890',
    templateLang: 'fr',
    templateName: 'zwibba_auth_code',
  },
};

test('sendText posts a text message payload to the Graph API and returns the message id', async () => {
  const requests: Array<{ body: unknown; headers: HeadersInit; url: string; method?: string }> =
    [];
  const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({
      body: JSON.parse(String(init?.body)),
      headers: init?.headers ?? {},
      method: init?.method,
      url: String(url),
    });
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.reply-test' }] }), {
      status: 200,
    });
  };
  const sender = new SupportReplySender(metaEnv, fetchFn);

  const result = await sender.sendText('243990000001', 'Bonjour, comment puis-je vous aider ?');

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
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
    type: 'text',
    text: {
      body: 'Bonjour, comment puis-je vous aider ?',
    },
  });
  assert.deepEqual(result, { messageId: 'wamid.reply-test' });
});

test('sendText does not call fetch and returns null when the body is empty or whitespace', async () => {
  const requests: unknown[] = [];
  const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url, init });
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.should-not-happen' }] }), {
      status: 200,
    });
  };
  const sender = new SupportReplySender(metaEnv, fetchFn);

  const emptyResult = await sender.sendText('243990000001', '');
  const whitespaceResult = await sender.sendText('243990000001', '   \n\t  ');

  assert.equal(requests.length, 0);
  assert.equal(emptyResult, null);
  assert.equal(whitespaceResult, null);
});

test('sendText returns null and does not throw on non-2xx Graph API responses', async () => {
  const fetchFn = async () => new Response('server error', { status: 500 });
  const sender = new SupportReplySender(metaEnv, fetchFn);

  const result = await sender.sendText('243990000001', 'Bonjour');

  assert.equal(result, null);
});
