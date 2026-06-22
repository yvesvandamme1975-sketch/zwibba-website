import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { TwilioVerifyService } from '../../src/auth/twilio-verify.service';

// Sessions are seeded directly into the fake so expiresAt is fully controlled.
// Guarded endpoint under test: GET /profile (SessionAuthGuard).

const PHONE_NUMBER = '+243990000001';

type SeededUser = { area: string; id: string; phoneNumber: string };
type SeededSession = { expiresAt: Date | null; token: string; user: SeededUser };

class _FakeTwilioVerifyService {
  async checkVerification() {
    return { sid: 'VE243990000001', status: 'approved' };
  }

  async requestVerification(phoneNumber: string) {
    return { sid: `VE${phoneNumber.replaceAll('+', '')}`, status: 'pending' };
  }
}

class _FakePrismaService {
  sessions = new Map<string, SeededSession>();
  users = new Map<string, SeededUser>();

  readonly session = {
    findUnique: async ({ where }: { where: { token: string } }) => {
      const session = this.sessions.get(where.token);

      if (!session) {
        return null;
      }

      return {
        expiresAt: session.expiresAt,
        token: session.token,
        user: { ...session.user },
      };
    },
    create: async () => ({ token: 'ignored' }),
  };

  readonly user = {
    findUnique: async ({ where }: { where: { phoneNumber: string } }) => {
      return (
        Array.from(this.users.values()).find(
          (user) => user.phoneNumber === where.phoneNumber,
        ) ?? null
      );
    },
    upsert: async ({ where }: { where: { phoneNumber: string } }) => {
      const id = `user_${where.phoneNumber.replaceAll('+', '')}`;
      const existing = this.users.get(id);

      if (existing) {
        return existing;
      }

      const user = { area: '', id, phoneNumber: where.phoneNumber };
      this.users.set(id, user);
      return user;
    },
  };

  readonly verificationAttempt = {
    count: async () => 0,
    create: async () => ({ id: 'attempt_1' }),
    updateMany: async () => ({ count: 1 }),
  };

  readonly walletTransaction = {
    count: async () => 0,
    create: async () => ({ id: 'wallet_tx_1' }),
  };

  seedSession({ expiresAt, token }: { expiresAt: Date | null; token: string }) {
    const id = `user_${PHONE_NUMBER.replaceAll('+', '')}`;
    const user = this.users.get(id) ?? {
      area: 'Lubumbashi',
      id,
      phoneNumber: PHONE_NUMBER,
    };
    this.users.set(id, user);
    this.sessions.set(token, { expiresAt, token, user });
    return token;
  }
}

async function createTestApp() {
  const prisma = new _FakePrismaService();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(TwilioVerifyService)
    .useValue(new _FakeTwilioVerifyService())
    .compile();

  const app: INestApplication = moduleRef.createNestApplication();
  await app.init();

  return { app, prisma };
}

test('an expired session is rejected with 401 on the guarded profile endpoint', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const expiredToken = 'zwibba_session_expired';
  harness.prisma.seedSession({
    expiresAt: new Date(Date.now() - 60 * 60 * 1000),
    token: expiredToken,
  });

  await request(harness.app.getHttpServer())
    .get('/profile')
    .set('authorization', `Bearer ${expiredToken}`)
    .expect(401);
});

test('a session with a future expiry is accepted on the guarded profile endpoint', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const futureToken = 'zwibba_session_future';
  harness.prisma.seedSession({
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    token: futureToken,
  });

  const response = await request(harness.app.getHttpServer())
    .get('/profile')
    .set('authorization', `Bearer ${futureToken}`)
    .expect(200);

  assert.equal(response.body.phoneNumber, PHONE_NUMBER);
});

test('a session with a null expiry is treated as non-expiring and accepted', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const neverExpiresToken = 'zwibba_session_null_expiry';
  harness.prisma.seedSession({ expiresAt: null, token: neverExpiresToken });

  await request(harness.app.getHttpServer())
    .get('/profile')
    .set('authorization', `Bearer ${neverExpiresToken}`)
    .expect(200);
});
