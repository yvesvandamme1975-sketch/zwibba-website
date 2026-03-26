import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

type VerificationAttemptRecord = {
  challengeId: string;
  phoneNumber: string;
  status: string;
};

class _FakePrismaService {
  readonly verificationAttempts: VerificationAttemptRecord[] = [];
  readonly sessions = new Map<string, {
    token: string;
    user: {
      phoneNumber: string;
    };
  }>();
  readonly walletTransactions: Array<{
    amountCdf: number;
    createdAtLabel: string;
    kind: string;
    label: string;
    userId: string;
  }> = [];

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
    create: async ({
      data,
    }: {
      data: VerificationAttemptRecord;
    }) => {
      this.verificationAttempts.push(data);
      return data;
    },
    updateMany: async ({
      data,
      where,
    }: {
      data: {
        challengeId: string;
        status: string;
      };
      where: {
        phoneNumber: string;
        status: string;
      };
    }) => {
      let count = 0;
      for (const attempt of this.verificationAttempts) {
        if (
          attempt.phoneNumber === where.phoneNumber &&
          attempt.status === where.status
        ) {
          attempt.challengeId = data.challengeId;
          attempt.status = data.status;
          count += 1;
        }
      }

      return { count };
    },
  };

  readonly walletTransaction = {
    count: async ({
      where,
    }: {
      where: {
        userId: string;
      };
    }) => {
      return this.walletTransactions.filter((transaction) => {
        return transaction.userId === where.userId;
      }).length;
    },
    create: async ({
      data,
    }: {
      data: {
        amountCdf: number;
        createdAtLabel: string;
        kind: string;
        label: string;
        userId: string;
      };
    }) => {
      this.walletTransactions.push(data);
      return data;
    },
  };
}

function setDemoEnv() {
  process.env.APP_BASE_URL = 'https://zwibba.example';
  process.env.DATABASE_URL = 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba';
  process.env.DEMO_OTP_ALLOWLIST = '+243990000001,+243990000002';
  process.env.DEMO_OTP_CODE = '123456';
  process.env.NODE_ENV = 'production';
  process.env.OTP_PROVIDER = 'demo';
  process.env.PORT = '3200';
  process.env.R2_ACCESS_KEY_ID = 'r2-access-key';
  process.env.R2_ACCOUNT_ID = 'r2-account';
  process.env.R2_BUCKET = 'zwibba-media';
  process.env.R2_PUBLIC_BASE_URL = 'https://cdn.zwibba.example';
  process.env.R2_S3_ENDPOINT = 'https://r2.example.com';
  process.env.R2_SECRET_ACCESS_KEY = 'r2-secret';
  process.env.ZWIBBA_ADMIN_SHARED_SECRET = 'zwibba-admin-secret';
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_VERIFY_SERVICE_SID;
}

function restoreEnv(snapshot: NodeJS.ProcessEnv) {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
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
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return {
    app,
    prisma,
  };
}

test('demo otp request stores an allowlisted verification attempt without Twilio config', async (t) => {
  const snapshot = { ...process.env };
  setDemoEnv();
  t.after(async () => {
    restoreEnv(snapshot);
  });

  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const response = await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  assert.equal(response.body.challengeId, 'DEMO243990000001');
  assert.equal(response.body.phoneNumber, '+243990000001');
  assert.equal(harness.prisma.verificationAttempts.length, 1);
  assert.equal(harness.prisma.verificationAttempts[0].status, 'pending');
});

test('demo otp verify returns a real seller session for the configured code', async (t) => {
  const snapshot = { ...process.env };
  setDemoEnv();
  t.after(async () => {
    restoreEnv(snapshot);
  });

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

  assert.equal(response.body.phoneNumber, '+243990000001');
  assert.equal(response.body.canSyncDrafts, true);
  assert.match(response.body.sessionToken, /^zwibba_session_/);
});

test('demo otp verify seeds the beta wallet credit exactly once', async (t) => {
  const snapshot = { ...process.env };
  setDemoEnv();
  t.after(async () => {
    restoreEnv(snapshot);
  });

  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      code: '123456',
      phoneNumber: '+243990000001',
    })
    .expect(201);

  await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      code: '123456',
      phoneNumber: '+243990000001',
    })
    .expect(201);

  assert.equal(harness.prisma.walletTransactions.length, 1);
  assert.equal(harness.prisma.walletTransactions[0].amountCdf, 30000);
  assert.equal(harness.prisma.walletTransactions[0].label, 'Crédit bêta Zwibba');
});

test('demo otp request rejects numbers outside the allowlist', async (t) => {
  const snapshot = { ...process.env };
  setDemoEnv();
  t.after(async () => {
    restoreEnv(snapshot);
  });

  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const response = await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243810000000' })
    .expect(403);

  assert.match(response.body.message, /demo/i);
});
