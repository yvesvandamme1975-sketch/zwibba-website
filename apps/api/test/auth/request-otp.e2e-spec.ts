import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { TwilioVerifyService } from '../../src/auth/twilio-verify.service';

type VerificationAttemptRecord = {
  challengeId: string;
  phoneNumber: string;
  status: string;
};

class _FakeTwilioVerifyService {
  finalizationCalls = 0;
  requestCalls = 0;

  async checkVerification() {
    this.finalizationCalls += 1;

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

  readonly session = {
    create: async () => {
      return {
        token: 'ignored',
      };
    },
    findUnique: async () => null,
  };

  readonly user = {
    upsert: async () => {
      return {
        id: 'user_243990000001',
      };
    },
  };

  readonly verificationAttempt = {
    create: async ({
      data,
    }: {
      data: VerificationAttemptRecord;
    }) => {
      this.verificationAttempts.push(data);
      return data;
    },
    updateMany: async () => ({ count: 1 }),
  };
}

async function createTestApp() {
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

  return {
    app,
    fakePrisma,
    fakeTwilio,
  };
}

test('request otp stores a verification attempt and calls twilio verify', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const response = await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  assert.equal(response.body.challengeId, 'VE243990000001');
  assert.equal(response.body.phoneNumber, '+243990000001');
  assert.equal(harness.fakeTwilio.requestCalls, 1);
  assert.equal(harness.fakePrisma.verificationAttempts.length, 1);
  assert.equal(
    harness.fakePrisma.verificationAttempts[0].phoneNumber,
    '+243990000001',
  );
  assert.equal(
    harness.fakePrisma.verificationAttempts[0].status,
    'pending',
  );
});
