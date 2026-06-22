import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { TwilioVerifyService } from '../../src/auth/twilio-verify.service';
import { OTP_RATE_MAX_REQUESTS } from '../../src/auth/otp-rate-limit';

type VerificationAttemptRecord = {
  challengeId: string;
  phoneNumber: string;
  status: string;
};

class _FakeTwilioVerifyService {
  requestCalls = 0;

  async checkVerification() {
    return {
      sid: 'VE243990000001',
      status: 'approved',
    };
  }

  async requestVerification(phoneNumber: string) {
    this.requestCalls += 1;

    return {
      sid: `VE${phoneNumber.replaceAll('+', '')}`,
      status: 'pending',
    };
  }
}

class _FakePrismaService {
  readonly verificationAttempts: VerificationAttemptRecord[] = [];

  // Controllable count returned by verificationAttempt.count.
  countValue = 0;

  readonly session = {
    create: async () => ({ token: 'ignored' }),
    findUnique: async () => null,
  };

  readonly user = {
    upsert: async () => ({ id: 'user_243990000001' }),
  };

  readonly verificationAttempt = {
    count: async () => this.countValue,
    create: async ({ data }: { data: VerificationAttemptRecord }) => {
      this.verificationAttempts.push(data);
      return data;
    },
    updateMany: async () => ({ count: 1 }),
  };
}

async function createTestApp(): Promise<{
  app: INestApplication;
  fakePrisma: _FakePrismaService;
  fakeTwilio: _FakeTwilioVerifyService;
}> {
  const fakePrisma = new _FakePrismaService();
  const fakeTwilio = new _FakeTwilioVerifyService();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(fakePrisma)
    .overrideProvider(TwilioVerifyService)
    .useValue(fakeTwilio)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return { app, fakePrisma, fakeTwilio };
}

test('request otp returns 429 when the per-phone attempt count is at the limit', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.fakePrisma.countValue = OTP_RATE_MAX_REQUESTS;

  const response = await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(429);

  assert.match(response.body.message, /Trop de demandes/i);
  assert.equal(harness.fakeTwilio.requestCalls, 0);
  assert.equal(harness.fakePrisma.verificationAttempts.length, 0);
});

test('request otp returns 429 when the per-phone attempt count is over the limit', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.fakePrisma.countValue = OTP_RATE_MAX_REQUESTS + 3;

  await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(429);

  assert.equal(harness.fakeTwilio.requestCalls, 0);
  assert.equal(harness.fakePrisma.verificationAttempts.length, 0);
});

test('request otp succeeds when the per-phone attempt count is under the limit', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.fakePrisma.countValue = 0;

  const response = await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  assert.equal(response.body.challengeId, 'VE243990000001');
  assert.equal(response.body.phoneNumber, '+243990000001');
  assert.equal(harness.fakeTwilio.requestCalls, 1);
  assert.equal(harness.fakePrisma.verificationAttempts.length, 1);
});
