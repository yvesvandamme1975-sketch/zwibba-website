import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import {
  InboundWhatsappMessage,
  SUPPORT_AGENT_SERVICE,
  SUPPORT_WEBHOOK_ENV,
  SupportAgentServiceLike,
} from '../../src/support/support.controller';

const whatsappVerifyToken = 'test-verify-token';
const metaAppSecret = 'test-meta-app-secret';

const supportWebhookEnv = {
  support: {
    whatsappVerifyToken,
    metaAppSecret,
  },
};

class FakeSupportAgentService implements SupportAgentServiceLike {
  readonly received: InboundWhatsappMessage[] = [];

  handleInboundMessage(message: InboundWhatsappMessage) {
    this.received.push(message);
  }
}

function signBody(rawBody: string, secret: string) {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

async function createTestApp() {
  const fakeSupportAgentService = new FakeSupportAgentService();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue({
      $queryRaw: async () => [{ status: 1 }],
    })
    .overrideProvider(SUPPORT_AGENT_SERVICE)
    .useValue(fakeSupportAgentService)
    .overrideProvider(SUPPORT_WEBHOOK_ENV)
    .useValue(supportWebhookEnv)
    .compile();

  const app: INestApplication = moduleRef.createNestApplication({ rawBody: true });
  await app.init();

  return { app, fakeSupportAgentService };
}

test('GET webhook returns the raw hub.challenge value when mode and token match', async (t) => {
  const { app } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .get('/support/whatsapp/webhook')
    .query({
      'hub.mode': 'subscribe',
      'hub.verify_token': whatsappVerifyToken,
      'hub.challenge': '1158201444',
    })
    .expect(200);

  assert.equal(response.text, '1158201444');
  assert.equal(response.body && Object.keys(response.body).length, 0);
});

test('GET webhook returns 403 when the verify token is wrong', async (t) => {
  const { app } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  await request(app.getHttpServer())
    .get('/support/whatsapp/webhook')
    .query({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong-token',
      'hub.challenge': '1158201444',
    })
    .expect(403);
});

test('GET webhook returns 403 when mode is not subscribe', async (t) => {
  const { app } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  await request(app.getHttpServer())
    .get('/support/whatsapp/webhook')
    .query({
      'hub.mode': 'unsubscribe',
      'hub.verify_token': whatsappVerifyToken,
      'hub.challenge': '1158201444',
    })
    .expect(403);
});

test('POST webhook rejects an invalid signature and never calls the handler', async (t) => {
  const { app, fakeSupportAgentService } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const payload = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  from: '243990000001',
                  id: 'wamid.1',
                  type: 'text',
                  text: { body: 'Bonjour' },
                },
              ],
            },
          },
        ],
      },
    ],
  };
  const rawBody = JSON.stringify(payload);

  await request(app.getHttpServer())
    .post('/support/whatsapp/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Hub-Signature-256', 'sha256=0000000000000000000000000000000000000000000000000000000000000000')
    .send(rawBody)
    .expect(401);

  assert.equal(fakeSupportAgentService.received.length, 0);
});

test('POST webhook rejects a missing signature and never calls the handler', async (t) => {
  const { app, fakeSupportAgentService } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const payload = { entry: [] };
  const rawBody = JSON.stringify(payload);

  await request(app.getHttpServer())
    .post('/support/whatsapp/webhook')
    .set('Content-Type', 'application/json')
    .send(rawBody)
    .expect(401);

  assert.equal(fakeSupportAgentService.received.length, 0);
});

test('POST webhook accepts a valid signature, forwards parsed text messages, and ignores non-text messages', async (t) => {
  const { app, fakeSupportAgentService } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const payload = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  from: '243990000001',
                  id: 'wamid.1',
                  type: 'text',
                  text: { body: 'Bonjour, comment vendre un article ?' },
                },
                {
                  from: '243990000002',
                  id: 'wamid.2',
                  type: 'image',
                },
              ],
            },
          },
        ],
      },
    ],
  };
  const rawBody = JSON.stringify(payload);
  const signature = signBody(rawBody, metaAppSecret);

  await request(app.getHttpServer())
    .post('/support/whatsapp/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Hub-Signature-256', signature)
    .send(rawBody)
    .expect(200);

  assert.equal(fakeSupportAgentService.received.length, 1);
  assert.deepEqual(fakeSupportAgentService.received[0], {
    waId: '243990000001',
    text: 'Bonjour, comment vendre un article ?',
    messageId: 'wamid.1',
  });
});

test('POST webhook rejects a signature computed over a tampered body', async (t) => {
  const { app, fakeSupportAgentService } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const originalPayload = { entry: [] };
  const tamperedPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  from: '243990000009',
                  id: 'wamid.tampered',
                  type: 'text',
                  text: { body: 'Injected' },
                },
              ],
            },
          },
        ],
      },
    ],
  };
  const signature = signBody(JSON.stringify(originalPayload), metaAppSecret);

  await request(app.getHttpServer())
    .post('/support/whatsapp/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Hub-Signature-256', signature)
    .send(JSON.stringify(tamperedPayload))
    .expect(401);

  assert.equal(fakeSupportAgentService.received.length, 0);
});
