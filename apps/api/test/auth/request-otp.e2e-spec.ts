import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
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
  readonly authIdentities = new Map<string, {
    phoneNumber: string | null;
    provider: string;
    providerEmail: string | null;
    providerSubject: string;
    userId: string;
    verifiedAt: Date | null;
  }>();
  readonly sessions = new Map<string, {
    token: string;
    user: UserRecord;
    userId: string;
  }>();
  readonly users = new Map<string, UserRecord>();
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
      const user = Array.from(this.users.values()).find((record) => {
        return record.id === data.userId;
      }) ?? {
        birthDate: null,
        countryCode: null,
        email: null,
        firstName: null,
        id: data.userId,
        lastName: null,
        locality: null,
        phoneNumber: '+243990000001',
        postNom: null,
      };
      const session = {
        token: data.token,
        user,
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
      const existingUser = this.users.get(phoneNumber);

      if (existingUser) {
        return existingUser;
      }

      const user = {
        birthDate: null,
        countryCode: null,
        email: null,
        firstName: null,
        id: `user_${phoneNumber.replaceAll('+', '')}`,
        lastName: null,
        locality: null,
        phoneNumber,
        postNom: null,
      } satisfies UserRecord;
      this.users.set(phoneNumber, user);
      return user;
    },
  };

  readonly authIdentity = {
    upsert: async ({
      create,
      update,
      where,
    }: {
      create: {
        phoneNumber: string | null;
        provider: string;
        providerEmail: string | null;
        providerSubject: string;
        userId: string;
        verifiedAt: Date;
      };
      update: {
        phoneNumber: string;
        userId: string;
        verifiedAt: Date;
      };
      where: {
        provider_providerSubject: {
          provider: string;
          providerSubject: string;
        };
      };
    }) => {
      const key = `${where.provider_providerSubject.provider}:${where.provider_providerSubject.providerSubject}`;
      const existingIdentity = this.authIdentities.get(key);

      if (existingIdentity) {
        const nextIdentity = {
          ...existingIdentity,
          phoneNumber: update.phoneNumber,
          userId: update.userId,
          verifiedAt: update.verifiedAt,
        };
        this.authIdentities.set(key, nextIdentity);
        return nextIdentity;
      }

      this.authIdentities.set(key, create);
      return create;
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
    authService: moduleRef.get(AuthService),
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

  const persistedSession =
    await harness.authService.requireSessionToken(response.body.sessionToken) as unknown as {
      requiredActions: string[];
      user: {
        phoneNumber: string | null;
      };
    };

  assert.equal(persistedSession.user.phoneNumber, '+243990000001');
  assert.deepEqual(persistedSession.requiredActions, ['complete_profile']);
});
