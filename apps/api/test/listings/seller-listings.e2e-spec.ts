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
  readonly drafts = new Map<string, {
    id: string;
    photos: Array<{
      publicUrl: string;
      uploadStatus: string;
    }>;
  }>();
  readonly listings = new Map<string, {
    area: string;
    categoryId: string;
    deletedBySellerAt?: Date | null;
    deletedReason?: string | null;
    draftId: string;
    id: string;
    lifecycleStatus?: string;
    previousLifecycleStatusBeforeDelete?: string | null;
    moderationStatus: string;
    ownerPhoneNumber: string;
    priceCdf: number;
    soldChannel?: string | null;
    soldAt?: Date | null;
    slug: string;
    title: string;
  }>();
  readonly moderationDecisions = new Map<string, {
    listingId: string;
    reasonSummary: string;
    status: string;
  }>();
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

  seedDraft(draft: {
    id: string;
    photos: Array<{
      publicUrl: string;
      uploadStatus: string;
    }>;
  }) {
    this.drafts.set(draft.id, draft);
  }

  seedListing(listing: {
    area: string;
    categoryId: string;
    deletedBySellerAt?: Date | null;
    deletedReason?: string | null;
    draftId: string;
    id: string;
    lifecycleStatus?: string;
    previousLifecycleStatusBeforeDelete?: string | null;
    moderationStatus: string;
    ownerPhoneNumber: string;
    priceCdf: number;
    soldChannel?: string | null;
    soldAt?: Date | null;
    slug: string;
    title: string;
  }) {
    this.listings.set(listing.id, listing);
  }

  seedModerationDecision(decision: {
    listingId: string;
    reasonSummary: string;
    status: string;
  }) {
    this.moderationDecisions.set(decision.listingId, decision);
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

  readonly draft = {
    findUnique: async ({
      where,
    }: {
      where: {
        id: string;
      };
    }) => {
      return this.drafts.get(where.id) ?? null;
    },
  };

  readonly listing = {
    findMany: async ({
      where,
    }: {
      where?: {
        ownerPhoneNumber?: string;
      };
    } = {}) => {
      return Array.from(this.listings.values()).filter((listing) => {
        if (!where?.ownerPhoneNumber) {
          return true;
        }

        return listing.ownerPhoneNumber === where.ownerPhoneNumber;
      });
    },
  };

  readonly moderationDecision = {
    findUnique: async ({
      where,
    }: {
      where: {
        listingId: string;
      };
    }) => {
      return this.moderationDecisions.get(where.listingId) ?? null;
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

test('seller listings endpoint returns the owner listing cards with moderation metadata', async (t) => {
  const prisma = new _FakePrismaService();
  prisma.seedDraft({
    id: 'draft_approved',
    photos: [
      {
        publicUrl: 'https://pub.example.test/samsung-a54.jpg',
        uploadStatus: 'uploaded',
      },
    ],
  });
  prisma.seedListing({
    area: 'Lubumbashi Centre',
    categoryId: 'phones_tablets',
    lifecycleStatus: 'active',
    draftId: 'draft_approved',
    id: 'listing_approved',
    moderationStatus: 'approved',
    ownerPhoneNumber: '+243990000001',
    priceCdf: 4256000,
    slug: 'samsung-galaxy-a54-128-go',
    title: 'Samsung Galaxy A54 128 Go',
  });
  prisma.seedModerationDecision({
    listingId: 'listing_approved',
    reasonSummary: 'Annonce approuvée et prête à partager.',
    status: 'approved',
  });
  prisma.seedDraft({
    id: 'draft_pending',
    photos: [],
  });
  prisma.seedListing({
    area: 'Bel Air',
    categoryId: 'vehicles',
    lifecycleStatus: 'deleted_by_seller',
    deletedBySellerAt: new Date('2026-03-30T08:00:00.000Z'),
    deletedReason: 'Je republierai plus tard',
    previousLifecycleStatusBeforeDelete: 'active',
    draftId: 'draft_pending',
    id: 'listing_pending',
    moderationStatus: 'pending_manual_review',
    ownerPhoneNumber: '+243990000001',
    priceCdf: 12000000,
    slug: 'toyota-hilux-2019-4x4',
    title: 'Toyota Hilux 2019 4x4',
  });
  prisma.seedModerationDecision({
    listingId: 'listing_pending',
    reasonSummary: 'Documents véhicule à vérifier',
    status: 'pending_manual_review',
  });

  const app = await createTestApp(prisma);
  t.after(async () => {
    await app.close();
  });

  await request(app.getHttpServer())
    .get('/listings/mine')
    .expect(401);

  const sessionToken = await createSellerSession(app, '+243990000001');
  const response = await request(app.getHttpServer())
    .get('/listings/mine')
    .set('authorization', `Bearer ${sessionToken}`)
    .expect(200);

  assert.equal(response.body.items.length, 2);
  assert.equal(response.body.items[0].id, 'listing_approved');
  assert.equal(response.body.items[0].primaryImageUrl, 'https://pub.example.test/samsung-a54.jpg');
  assert.equal(response.body.items[0].lifecycleStatus, 'active');
  assert.equal(response.body.items[0].canDelete, true);
  assert.equal(response.body.items[0].canRestore, false);
  assert.equal(response.body.items[1].moderationStatus, 'pending_manual_review');
  assert.equal(response.body.items[1].lifecycleStatus, 'deleted_by_seller');
  assert.equal(response.body.items[1].deletedReason, 'Je republierai plus tard');
  assert.match(response.body.items[1].restoreUntil, /2026-04-29T08:00:00.000Z/);
  assert.equal(response.body.items[1].canRestore, true);
  assert.equal(response.body.items[1].reasonSummary, 'Documents véhicule à vérifier');
});
