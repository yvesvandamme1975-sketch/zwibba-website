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
  readonly lifecycleEvents: Array<Record<string, unknown>> = [];
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

  seedListing(listing: Record<string, unknown>) {
    this.listings.set(listing.id as string, listing);
  }

  readonly $transaction = async <T>(
    callback: (transaction: _FakePrismaService) => Promise<T>,
  ) => callback(this);

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
    }) => this.sessions.get(where.token) ?? null,
  };

  readonly user = {
    upsert: async ({
      where,
    }: {
      where: {
        phoneNumber: string;
      };
    }) => {
      const existingUser = Array.from(this.users.values()).find((user) => user.phoneNumber === where.phoneNumber);

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
    findUnique: async ({
      where,
    }: {
      where: {
        phoneNumber?: string;
      };
    }) => Array.from(this.users.values()).find((user) => user.phoneNumber === where.phoneNumber) ?? null,
  };

  readonly verificationAttempt = {
    create: async () => ({ id: 'attempt_1' }),
    updateMany: async () => ({ count: 1 }),
  };

  readonly walletTransaction = {
    count: async () => 1,
    create: async () => ({ id: 'wallet_tx_1' }),
  };

  readonly listing = {
    findUnique: async ({
      where,
    }: {
      where: {
        id?: string;
        slug?: string;
      };
    }) => {
      return Array.from(this.listings.values()).find((listing) => {
        if (where.id) {
          return listing.id === where.id;
        }

        if (where.slug) {
          return listing.slug === where.slug;
        }

        return false;
      }) ?? null;
    },
    update: async ({
      data,
      where,
    }: {
      data: Record<string, unknown>;
      where: {
        id: string;
      };
    }) => {
      const nextListing = {
        ...(this.listings.get(where.id) ?? {}),
        ...data,
      };
      this.listings.set(where.id, nextListing);
      return nextListing;
    },
  };

  readonly listingLifecycleEvent = {
    create: async ({
      data,
    }: {
      data: Record<string, unknown>;
    }) => {
      this.lifecycleEvents.push(data);
      return data;
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

async function createSellerSession(app: INestApplication, phoneNumber: string) {
  await request(app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber })
    .expect(201);

  const verifyResponse = await request(app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      code: '123456',
      phoneNumber,
    })
    .expect(201);

  return verifyResponse.body.sessionToken as string;
}

test('seller lifecycle endpoint deletes and restores a listing within the restore window', async (t) => {
  const prisma = new _FakePrismaService();
  prisma.seedListing({
    area: 'Lubumbashi Centre',
    categoryId: 'electronics',
    deletedBySellerAt: null,
    deletedReason: null,
    description: 'Ordinateur portable.',
    draftId: 'draft_lifecycle_1',
    id: 'listing_lifecycle_1',
    lifecycleStatus: 'active',
    moderationStatus: 'approved',
    ownerPhoneNumber: '+243990000001',
    pausedAt: null,
    previousLifecycleStatusBeforeDelete: null,
    priceCdf: 850000,
    slug: 'ordinateur-portable-test',
    soldAt: null,
    soldChannel: null,
    title: 'Ordinateur portable test',
  });

  const app = await createTestApp(prisma);
  t.after(async () => {
    await app.close();
  });

  const sessionToken = await createSellerSession(app, '+243990000001');

  const deleteResponse = await request(app.getHttpServer())
    .post('/listings/listing_lifecycle_1/lifecycle')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      action: 'delete',
      reasonCode: 'republish_later',
    })
    .expect(200);

  assert.equal(deleteResponse.body.lifecycleStatus, 'deleted_by_seller');
  assert.equal(deleteResponse.body.deletedReason, 'Je republierai plus tard');
  assert.equal(prisma.listings.get('listing_lifecycle_1')?.lifecycleStatus, 'deleted_by_seller');
  assert.equal(prisma.lifecycleEvents.at(-1)?.action, 'deleted_by_seller');

  const restoreResponse = await request(app.getHttpServer())
    .post('/listings/listing_lifecycle_1/lifecycle')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      action: 'restore',
    })
    .expect(200);

  assert.equal(restoreResponse.body.lifecycleStatus, 'active');
  assert.equal(prisma.listings.get('listing_lifecycle_1')?.lifecycleStatus, 'active');
  assert.equal(prisma.lifecycleEvents.at(-1)?.action, 'restored');
});

test('seller lifecycle endpoint requires a sold reason and can relist a sold listing', async (t) => {
  const prisma = new _FakePrismaService();
  prisma.seedListing({
    area: 'Golf',
    categoryId: 'phones_tablets',
    deletedBySellerAt: null,
    deletedReason: null,
    description: 'Téléphone propre.',
    draftId: 'draft_lifecycle_2',
    id: 'listing_lifecycle_2',
    lifecycleStatus: 'active',
    moderationStatus: 'approved',
    ownerPhoneNumber: '+243990000001',
    pausedAt: null,
    previousLifecycleStatusBeforeDelete: null,
    priceCdf: 350000,
    slug: 'telephone-test',
    soldAt: null,
    soldChannel: null,
    title: 'Téléphone test',
  });

  const app = await createTestApp(prisma);
  t.after(async () => {
    await app.close();
  });

  const sessionToken = await createSellerSession(app, '+243990000001');

  const pauseResponse = await request(app.getHttpServer())
    .post('/listings/listing_lifecycle_2/lifecycle')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      action: 'pause',
    })
    .expect(200);

  assert.equal(pauseResponse.body.lifecycleStatus, 'paused');

  const resumeResponse = await request(app.getHttpServer())
    .post('/listings/listing_lifecycle_2/lifecycle')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      action: 'resume',
    })
    .expect(200);

  assert.equal(resumeResponse.body.lifecycleStatus, 'active');

  await request(app.getHttpServer())
    .post('/listings/listing_lifecycle_2/lifecycle')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      action: 'mark_sold',
    })
    .expect(400);

  const soldResponse = await request(app.getHttpServer())
    .post('/listings/listing_lifecycle_2/lifecycle')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      action: 'mark_sold',
      reasonCode: 'sold_on_zwibba',
    })
    .expect(200);

  assert.equal(soldResponse.body.lifecycleStatus, 'sold');
  assert.equal(soldResponse.body.soldChannel, 'Vendu sur Zwibba');

  const relistResponse = await request(app.getHttpServer())
    .post('/listings/listing_lifecycle_2/lifecycle')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      action: 'relist',
    })
    .expect(200);

  assert.equal(relistResponse.body.lifecycleStatus, 'active');
  assert.equal(prisma.lifecycleEvents.at(-1)?.action, 'relisted');
});
