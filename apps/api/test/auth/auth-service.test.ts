import { BadRequestException } from '@nestjs/common';
import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthService } from '../../src/auth/auth.service';

function setDemoEnv() {
  process.env.APP_BASE_URL = 'https://zwibba.example';
  process.env.AI_PROVIDER = 'stub';
  process.env.DATABASE_URL = 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba';
  process.env.DEMO_OTP_ALLOWLIST = '+243990000001';
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

class FakePrismaWithoutWalletTransaction {
  sessionTokens: string[] = [];

  readonly session = {
    create: async ({ data }: { data: { token: string } }) => {
      this.sessionTokens.push(data.token);
      return data;
    },
    findUnique: async () => null,
  };

  readonly user = {
    upsert: async () => ({
      id: 'user_243990000001',
      phoneNumber: '+243990000001',
    }),
  };

  readonly verificationAttempt = {
    count: async () => 0,
    create: async () => ({}),
    updateMany: async () => ({ count: 1 }),
  };
}

class FakeOtpService {
  async checkVerification() {
    return {
      sid: 'otp_challenge_1',
      status: 'approved',
    };
  }

  async requestVerification() {
    return {
      sid: 'otp_challenge_1',
      status: 'pending',
    };
  }
}

class FakeBelgianOtpService {
  requestVerificationCalls = 0;

  async checkVerification() {
    return {
      sid: 'sid-1',
      status: 'approved',
    };
  }

  async requestVerification() {
    this.requestVerificationCalls += 1;
    return {
      sid: 'sid-1',
      status: 'approved',
    };
  }
}

class FakePrismaCapturingUpsert {
  sessionTokens: string[] = [];
  upsertCalls: Array<{
    create: { phoneNumber: string; countryCode?: string };
    update: { countryCode?: string };
  }> = [];

  readonly session = {
    create: async ({ data }: { data: { token: string } }) => {
      this.sessionTokens.push(data.token);
      return data;
    },
    findUnique: async () => null,
  };

  readonly user = {
    upsert: async ({
      create,
      update,
    }: {
      create: { phoneNumber: string; countryCode?: string };
      update: { countryCode?: string };
    }) => {
      this.upsertCalls.push({ create, update });
      return {
        id: 'user_32499000001',
        phoneNumber: create.phoneNumber,
      };
    },
  };

  readonly verificationAttempt = {
    count: async () => 0,
    create: async () => ({}),
    updateMany: async () => ({ count: 1 }),
  };
}

test('verifyOtp skips demo wallet seeding when the Prisma fake has no walletTransaction delegate', async (t) => {
  const snapshot = { ...process.env };
  setDemoEnv();
  t.after(() => {
    restoreEnv(snapshot);
  });

  const prisma = new FakePrismaWithoutWalletTransaction();
  const ServiceConstructor = AuthService as unknown as new (
    prismaService: FakePrismaWithoutWalletTransaction,
    otpService: FakeOtpService,
  ) => AuthService;
  const service = new ServiceConstructor(prisma, new FakeOtpService());

  const session = await service.verifyOtp({
    code: '123456',
    phoneNumber: '+243990000001',
  });

  assert.equal(session.phoneNumber, '+243990000001');
  assert.match(session.sessionToken, /^zwibba_session_/);
  assert.equal(prisma.sessionTokens.length, 1);
});

test('requestOtp rejects a French number with the +243/+32 message and never calls the OTP service', async (t) => {
  const snapshot = { ...process.env };
  setDemoEnv();
  t.after(() => {
    restoreEnv(snapshot);
  });

  const prisma = new FakePrismaWithoutWalletTransaction();
  const otpService = new FakeOtpService();
  let requestVerificationCalled = false;
  otpService.requestVerification = async () => {
    requestVerificationCalled = true;
    return { sid: 'otp_challenge_1', status: 'pending' };
  };

  const ServiceConstructor = AuthService as unknown as new (
    prismaService: FakePrismaWithoutWalletTransaction,
    otpService: FakeOtpService,
  ) => AuthService;
  const service = new ServiceConstructor(prisma, otpService);

  await assert.rejects(
    () => service.requestOtp('+33612345678'),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, 'Le numéro doit commencer par +243 ou +32.');
      return true;
    },
  );

  assert.equal(requestVerificationCalled, false);
});

test('verifyOtp persists countryCode BE for a Belgian phone number', async (t) => {
  const snapshot = { ...process.env };
  setDemoEnv();
  t.after(() => {
    restoreEnv(snapshot);
  });

  const prisma = new FakePrismaCapturingUpsert();
  const ServiceConstructor = AuthService as unknown as new (
    prismaService: FakePrismaCapturingUpsert,
    otpService: FakeBelgianOtpService,
  ) => AuthService;
  const service = new ServiceConstructor(prisma, new FakeBelgianOtpService());

  const session = await service.verifyOtp({
    code: '123456',
    phoneNumber: '+32499000001',
  });

  assert.equal(session.phoneNumber, '+32499000001');
  assert.equal(prisma.upsertCalls.length, 1);
  assert.equal(prisma.upsertCalls[0].create.countryCode, 'BE');
  assert.equal(prisma.upsertCalls[0].update.countryCode, 'BE');
});
