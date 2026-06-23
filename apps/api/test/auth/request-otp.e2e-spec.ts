import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { OtpService } from '../../src/auth/otp.service';
import { WhatsappOtpSender } from '../../src/auth/whatsapp-otp.sender';

type VerificationAttemptRecord = {
  challengeId: string;
  phoneNumber: string;
  status: string;
};

type OtpChallengeRecord = {
  id: string;
  phoneNumber: string;
  codeHash: string;
  expiresAt: Date;
  attemptCount: number;
  consumedAt: Date | null;
  createdAt: Date;
};

class _FakeOtpService {
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
  private nextOtpChallengeId = 1;
  readonly verificationAttempts: VerificationAttemptRecord[] = [];
  readonly otpChallenges: OtpChallengeRecord[] = [];
  readonly walletTransactions: Array<{ userId: string }> = [];

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
    count: async () => 0,
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

  readonly otpChallenge = {
    create: async ({
      data,
    }: {
      data: {
        codeHash: string;
        expiresAt: Date;
        phoneNumber: string;
      };
    }) => {
      const record = {
        ...data,
        id: `otp_challenge_${this.nextOtpChallengeId++}`,
        attemptCount: 0,
        consumedAt: null,
        createdAt: new Date(),
      };
      this.otpChallenges.push(record);
      return record;
    },
    findFirst: async ({ where }: { where: { phoneNumber: string } }) => {
      return this.otpChallenges
        .filter((record) => record.phoneNumber === where.phoneNumber)
        .filter((record) => record.consumedAt === null)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;
    },
    update: async ({
      data,
      where,
    }: {
      data: Partial<OtpChallengeRecord>;
      where: { id: string };
    }) => {
      const record = this.otpChallenges.find((candidate) => candidate.id === where.id);
      assert.ok(record);
      Object.assign(record, data);
      return record;
    },
    updateMany: async ({
      data,
      where,
    }: {
      data: Partial<OtpChallengeRecord>;
      where: { phoneNumber: string };
    }) => {
      const records = this.otpChallenges.filter((record) => (
        record.phoneNumber === where.phoneNumber && record.consumedAt === null
      ));
      for (const record of records) {
        Object.assign(record, data);
      }
      return {
        count: records.length,
      };
    },
  };

  readonly walletTransaction = {
    count: async ({ where }: { where: { userId: string } }) => {
      return this.walletTransactions.filter((record) => record.userId === where.userId).length;
    },
    create: async ({ data }: { data: { userId: string } }) => {
      this.walletTransactions.push(data);
      return data;
    },
  };
}

class _FakeWhatsappOtpSender {
  readonly sent: Array<{ code: string; phoneNumber: string }> = [];

  async sendAuthenticationCode(message: { code: string; phoneNumber: string }) {
    this.sent.push(message);
  }
}

async function createTestApp() {
  const fakePrisma = new _FakePrismaService();
  const fakeOtp = new _FakeOtpService();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideProvider(OtpService)
      .useValue(fakeOtp)
      .compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return {
    app,
    fakePrisma,
    fakeOtp,
  };
}

async function createLocalOtpTestApp() {
  const fakePrisma = new _FakePrismaService();
  const fakeWhatsappOtpSender = new _FakeWhatsappOtpSender();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideProvider(WhatsappOtpSender)
      .useValue(fakeWhatsappOtpSender)
      .compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return {
    app,
    fakePrisma,
    fakeWhatsappOtpSender,
  };
}

test('request otp stores a verification attempt and calls otp service', async (t) => {
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
  assert.equal(harness.fakeOtp.requestCalls, 1);
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

test('demo otp request and verify returns a session through local challenge storage', async (t) => {
  const harness = await createLocalOtpTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const requestResponse = await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  assert.equal(requestResponse.body.phoneNumber, '+243990000001');
  assert.equal(harness.fakePrisma.otpChallenges.length, 1);
  assert.equal(requestResponse.body.challengeId, harness.fakePrisma.otpChallenges[0].id);
  assert.equal(harness.fakeWhatsappOtpSender.sent.length, 0);

  const verifyResponse = await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      code: '123456',
      phoneNumber: '+243990000001',
    })
    .expect(201);

  assert.equal(verifyResponse.body.phoneNumber, '+243990000001');
  assert.equal(verifyResponse.body.canSyncDrafts, true);
  assert.match(verifyResponse.body.sessionToken, /^zwibba_session_/);
  assert.equal(harness.fakePrisma.otpChallenges[0].attemptCount, 1);
  assert.ok(harness.fakePrisma.otpChallenges[0].consumedAt);
});
