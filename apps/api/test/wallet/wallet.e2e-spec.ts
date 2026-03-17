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
      id: string;
      phoneNumber: string;
    };
    userId: string;
  }>();
  readonly users = new Map<string, {
    id: string;
    phoneNumber: string;
  }>();
  readonly walletTransactions = new Map<string, Record<string, unknown>>();

  seedWalletTransaction(transaction: {
    amountCdf: number;
    createdAtLabel: string;
    id: string;
    kind: string;
    label: string;
    userId: string;
  }) {
    this.walletTransactions.set(transaction.id, transaction);
  }

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
        id: data.userId,
        phoneNumber: '+243990000001',
      };
      const session = {
        token: data.token,
        user,
        userId: user.id,
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
    findUnique: async ({
      where,
    }: {
      where: {
        phoneNumber: string;
      };
    }) => {
      return Array.from(this.users.values()).find((user) => {
        return user.phoneNumber === where.phoneNumber;
      }) ?? null;
    },
    upsert: async ({
      where,
    }: {
      where: {
        phoneNumber: string;
      };
    }) => {
      const existingUser = Array.from(this.users.values()).find((user) => {
        return user.phoneNumber === where.phoneNumber;
      });

      if (existingUser) {
        return existingUser;
      }

      const user = {
        id: `user_${where.phoneNumber.replaceAll('+', '')}`,
        phoneNumber: where.phoneNumber,
      };
      this.users.set(user.id, user);
      return user;
    },
  };

  readonly verificationAttempt = {
    create: async () => ({ id: 'attempt_1' }),
    updateMany: async () => ({ count: 1 }),
  };

  readonly walletTransaction = {
    findMany: async ({
      where,
    }: {
      where: {
        userId: string;
      };
    }) => {
      return Array.from(this.walletTransactions.values()).filter((transaction) => {
        return transaction.userId === where.userId;
      });
    },
  };
}

async function createTestApp(prisma: _FakePrismaService): Promise<INestApplication> {
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
  return app;
}

async function createSellerSession(
  app: INestApplication,
  phoneNumber: string,
): Promise<string> {
  await request(app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber })
    .expect(201);

  const verifyResponse = await request(app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      phoneNumber,
      code: '123456',
    })
    .expect(201);

  return verifyResponse.body.sessionToken as string;
}

test('wallet endpoint requires a session and returns a ledger-backed balance', async (t) => {
  const prisma = new _FakePrismaService();
  const sellerUser = await prisma.user.upsert({
    where: {
      phoneNumber: '+243990000001',
    },
  });
  await prisma.user.upsert({
    where: {
      phoneNumber: '+243990000002',
    },
  });
  prisma.seedWalletTransaction({
    amountCdf: 450000,
    createdAtLabel: 'Aujourd’hui',
    id: 'wallet_tx_1',
    kind: 'credit',
    label: 'Vente Samsung Galaxy A54',
    userId: sellerUser.id,
  });
  prisma.seedWalletTransaction({
    amountCdf: -15000,
    createdAtLabel: 'Hier',
    id: 'wallet_tx_2',
    kind: 'debit',
    label: 'Boost annonce Samsung Galaxy A54',
    userId: sellerUser.id,
  });
  prisma.seedWalletTransaction({
    amountCdf: 99000,
    createdAtLabel: 'Hier',
    id: 'wallet_tx_3',
    kind: 'credit',
    label: 'Autre compte',
    userId: 'user_243990000002',
  });

  const app = await createTestApp(prisma);
  t.after(async () => {
    await app.close();
  });

  await request(app.getHttpServer())
    .get('/wallet')
    .expect(401);

  const sessionToken = await createSellerSession(app, '+243990000001');
  const response = await request(app.getHttpServer())
    .get('/wallet')
    .set('authorization', `Bearer ${sessionToken}`)
    .expect(200);

  assert.equal(response.body.balanceCdf, 435000);
  assert.equal(response.body.transactions.length, 2);
  assert.equal(response.body.transactions[0].label, 'Vente Samsung Galaxy A54');
  assert.equal(response.body.transactions[1].label, 'Boost annonce Samsung Galaxy A54');
});
