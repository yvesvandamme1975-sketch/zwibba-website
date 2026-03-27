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

type UserRecord = {
  birthDate: null;
  countryCode: null;
  email: null;
  firstName: null;
  id: string;
  lastName: null;
  locality: null;
  phoneNumber: string;
  postNom: null;
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
    create: async ({
      data,
    }: {
      data: {
        token: string;
        userId: string;
      };
    }) => {
      return {
        token: data.token,
        user: {
          birthDate: null,
          countryCode: null,
          email: null,
          firstName: null,
          id: data.userId,
          lastName: null,
          locality: null,
          phoneNumber: '+243990000001',
          postNom: null,
        } satisfies UserRecord,
      };
    },
    findUnique: async () => null,
  };

  readonly user = {
    upsert: async ({
      create,
      where,
    }: {
      create?: {
        phoneNumber?: string;
      };
      where?: {
        phoneNumber?: string;
      };
    }) => {
      const phoneNumber = where?.phoneNumber ?? create?.phoneNumber ?? '+243990000001';
      return {
        birthDate: null,
        countryCode: null,
        email: null,
        firstName: null,
        id: `user_${phoneNumber.replaceAll('+', '')}`,
        lastName: null,
        locality: null,
        phoneNumber,
        postNom: null,
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

test('verify otp returns an incomplete account session payload', async (t) => {
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
      code: '123456',
      phoneNumber: '+243990000001',
    })
    .expect(201);

  assert.match(response.body.sessionToken, /^zwibba_session_/);
  assert.equal(response.body.user.phoneNumber, '+243990000001');
  assert.equal(response.body.user.email, null);
  assert.equal(response.body.user.firstName, null);
  assert.equal(response.body.user.lastName, null);
  assert.equal(response.body.user.postNom, null);
  assert.equal(response.body.user.birthDate, null);
  assert.equal(response.body.user.countryCode, null);
  assert.equal(response.body.user.locality, null);
  assert.deepEqual(response.body.requiredActions, ['complete_profile']);
  assert.equal(harness.fakeTwilio.finalizationCalls, 1);
});
