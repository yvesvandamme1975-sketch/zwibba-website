import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { TwilioVerifyService } from '../../src/auth/twilio-verify.service';

class _FakeTwilioVerifyService {
  async checkVerification({
    code,
  }: {
    code: string;
    phoneNumber: string;
  }) {
    return {
      sid: 'VE243990000001',
      status: code == '123456' ? 'approved' : 'pending',
    };
  }

  async requestVerification(phoneNumber: string) {
    return {
      sid: `VE${phoneNumber.replaceAll('+', '')}`,
      status: 'pending',
    };
  }
}

class _FakePrismaService {
  readonly sessions = new Map<string, {
    token: string;
    user: {
      phoneNumber: string;
    };
  }>();

  readonly session = {
    create: async ({
      data,
    }: {
      data: {
        token: string;
        userId: string;
      };
    }) => {
      const session = {
        token: data.token,
        user: {
          phoneNumber: '+243990000001',
        },
        userId: data.userId,
      };
      this.sessions.set(session.token, session);
      return session;
    },
    findUnique: async ({
      where,
    }: {
      where: {
        token: string;
      };
    }) => {
      return this.sessions.get(where.token) ?? null;
    },
  };

  readonly user = {
    upsert: async () => {
      return {
        id: 'user_243990000001',
        phoneNumber: '+243990000001',
      };
    },
  };

  readonly verificationAttempt = {
    create: async () => ({ id: 'attempt_1' }),
    updateMany: async () => ({ count: 1 }),
  };
}

async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: _FakePrismaService;
}> {
  const prisma = new _FakePrismaService();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(TwilioVerifyService)
      .useValue(new _FakeTwilioVerifyService())
      .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return {
    app,
    prisma,
  };
}

test('otp verify returns a seller session token', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  const response = await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      phoneNumber: '+243990000001',
      code: '123456',
    })
    .expect(201);

  assert.equal(response.body.phoneNumber, '+243990000001');
  assert.equal(response.body.canSyncDrafts, true);
  assert.match(response.body.sessionToken, /^zwibba_session_/);
  assert.equal(harness.prisma.sessions.size, 1);
});

test('draft sync accepts an authenticated seller draft', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  const verifyResponse = await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      phoneNumber: '+243990000001',
      code: '123456',
    })
    .expect(201);

  const syncResponse = await request(harness.app.getHttpServer())
    .post('/drafts/sync')
    .set('authorization', `Bearer ${verifyResponse.body.sessionToken}`)
    .send({
      title: 'Samsung Galaxy A54 128 Go',
      categoryId: 'phones_tablets',
      area: 'Lubumbashi Centre',
      priceCdf: 4256000,
    })
    .expect(201);

  assert.equal(syncResponse.body.syncStatus, 'synced');
  assert.equal(syncResponse.body.title, 'Samsung Galaxy A54 128 Go');
  assert.match(syncResponse.body.draftId, /^draft_/);
});

test('draft sync rejects a missing seller session token', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  await request(harness.app.getHttpServer())
    .post('/drafts/sync')
    .send({
      title: 'Samsung Galaxy A54 128 Go',
      categoryId: 'phones_tablets',
      area: 'Lubumbashi Centre',
      priceCdf: 4256000,
    })
    .expect(401);
});
