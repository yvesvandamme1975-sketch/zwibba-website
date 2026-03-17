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
  readonly boostPurchases = new Map<string, Record<string, unknown>>();
  readonly listings = new Map<string, Record<string, unknown>>();
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

  readonly $transaction = async <T>(
    callback: (transaction: _FakePrismaService) => Promise<T>,
  ) => {
    return callback(this);
  };

  seedListing(listing: {
    id: string;
    ownerPhoneNumber: string;
    title: string;
  }) {
    this.listings.set(listing.id, listing);
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

  readonly listing = {
    findUnique: async ({
      where,
    }: {
      where: {
        id: string;
      };
    }) => {
      return this.listings.get(where.id) ?? null;
    },
  };

  readonly walletTransaction = {
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
      const transactionId = `wallet_tx_${this.walletTransactions.size + 1}`;
      const transaction = {
        ...data,
        id: transactionId,
      };
      this.walletTransactions.set(transactionId, transaction);
      return transaction;
    },
  };

  readonly boostPurchase = {
    create: async ({
      data,
    }: {
      data: {
        amountCdf: number;
        durationHours: number;
        listingId: string;
        userId: string;
        walletTransactionId: string;
      };
    }) => {
      const purchaseId = `boost_${this.boostPurchases.size + 1}`;
      const purchase = {
        ...data,
        id: purchaseId,
      };
      this.boostPurchases.set(purchaseId, purchase);
      return purchase;
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

test('boost activation requires a session and persists both purchase and wallet debit', async (t) => {
  const prisma = new _FakePrismaService();
  await prisma.user.upsert({
    where: {
      phoneNumber: '+243990000001',
    },
  });
  prisma.seedListing({
    id: 'listing_approved',
    ownerPhoneNumber: '+243990000001',
    title: 'Samsung Galaxy A54 128 Go',
  });

  const app = await createTestApp(prisma);
  t.after(async () => {
    await app.close();
  });

  await request(app.getHttpServer())
    .post('/boost')
    .send({
      listingId: 'listing_approved',
    })
    .expect(401);

  const sessionToken = await createSellerSession(app, '+243990000001');
  const response = await request(app.getHttpServer())
    .post('/boost')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      listingId: 'listing_approved',
    })
    .expect(201);

  assert.equal(response.body.listingId, 'listing_approved');
  assert.equal(response.body.promoted, true);
  assert.equal(response.body.amountCdf, 15000);
  assert.equal(prisma.boostPurchases.size, 1);
  assert.equal(prisma.walletTransactions.size, 1);
  assert.equal(
    Array.from(prisma.walletTransactions.values())[0].amountCdf,
    -15000,
  );
});
