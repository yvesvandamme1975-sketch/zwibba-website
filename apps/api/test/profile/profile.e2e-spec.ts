import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { TwilioVerifyService } from '../../src/auth/twilio-verify.service';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

class _FakeTwilioVerifyService {
  async checkVerification() {
    return {
      sid: 'VE243990000001',
      status: 'approved',
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
  sessions = new Map<string, {
    token: string;
    user: {
      area: string;
      id: string;
      phoneNumber: string;
    };
  }>();
  users = new Map<string, {
    area: string;
    id: string;
    phoneNumber: string;
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
      const user = this.users.get(data.userId) ?? {
        area: '',
        id: data.userId,
        phoneNumber: '+243990000001',
      };
      const session = {
        token: data.token,
        user,
      };
      this.sessions.set(session.token, session);
      return {
        token: session.token,
        userId: data.userId,
      };
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
    findUnique: async ({
      where,
    }: {
      where: {
        phoneNumber: string;
      };
    }) => {
      return Array.from(this.users.values()).find((user) => user.phoneNumber === where.phoneNumber) ?? null;
    },
    update: async ({
      data,
      where,
    }: {
      data: {
        area: string;
      };
      where: {
        phoneNumber: string;
      };
    }) => {
      const currentUser = Array.from(this.users.values()).find((user) => user.phoneNumber === where.phoneNumber);

      if (!currentUser) {
        throw new Error('User not found');
      }

      const nextUser = {
        ...currentUser,
        area: data.area,
      };
      this.users.set(nextUser.id, nextUser);

      for (const [token, session] of this.sessions.entries()) {
        if (session.user.phoneNumber === where.phoneNumber) {
          this.sessions.set(token, {
            ...session,
            user: nextUser,
          });
        }
      }

      return nextUser;
    },
    upsert: async ({
      where,
    }: {
      where: {
        phoneNumber: string;
      };
    }) => {
      const id = `user_${where.phoneNumber.replaceAll('+', '')}`;
      const existingUser = this.users.get(id);

      if (existingUser) {
        return existingUser;
      }

      const user = {
        area: '',
        id,
        phoneNumber: where.phoneNumber,
      };
      this.users.set(id, user);
      return user;
    },
  };

  readonly verificationAttempt = {
    create: async () => ({ id: 'attempt_1' }),
    updateMany: async () => ({ count: 1 }),
  };

  readonly walletTransaction = {
    count: async () => 0,
    create: async () => ({ id: 'wallet_tx_1' }),
  };
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

  const app = moduleRef.createNestApplication();
  await app.init();

  return {
    app,
    prisma,
  };
}

test('profile endpoints return and persist the seller zone for the active session', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const verifyResponse = await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      code: '123456',
      phoneNumber: '+243990000001',
    })
    .expect(201);

  const sessionToken = verifyResponse.body.sessionToken;

  const getBefore = await request(harness.app.getHttpServer())
    .get('/profile')
    .set('authorization', `Bearer ${sessionToken}`)
    .expect(200);

  assert.equal(getBefore.body.phoneNumber, '+243990000001');
  assert.equal(getBefore.body.area, '');

  const saveResponse = await request(harness.app.getHttpServer())
    .post('/profile')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      area: 'Golf',
    })
    .expect(201);

  assert.equal(saveResponse.body.phoneNumber, '+243990000001');
  assert.equal(saveResponse.body.area, 'Golf');

  const getAfter = await request(harness.app.getHttpServer())
    .get('/profile')
    .set('authorization', `Bearer ${sessionToken}`)
    .expect(200);

  assert.equal(getAfter.body.area, 'Golf');
});
