import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { TwilioVerifyService } from '../../src/auth/twilio-verify.service';

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
  readonly draftPhotosByDraftId = new Map<string, Array<Record<string, unknown>>>();
  readonly drafts = new Map<string, Record<string, unknown>>();
  readonly listings = new Map<string, Record<string, unknown>>();
  readonly moderationDecisions = new Map<string, Record<string, unknown>>();
  readonly sessions = new Map<string, {
    token: string;
    user: {
      phoneNumber: string;
    };
  }>();
  readonly $transaction = async <T>(
    callback: (transaction: _FakePrismaService) => Promise<T>,
  ) => {
    return callback(this);
  };

  readonly session = {
    create: async ({
      data,
    }: {
      data: {
        token: string;
        userId: string;
      };
    }) => {
      const phoneNumber = this.users.get(data.userId) ?? '+243990000001';
      const session = {
        token: data.token,
        user: {
          phoneNumber,
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

  readonly users = new Map<string, string>();

  readonly user = {
    upsert: async ({
      where,
    }: {
      where: {
        phoneNumber: string;
      };
    }) => {
      const userId = `user_${where.phoneNumber.replaceAll('+', '')}`;
      this.users.set(userId, where.phoneNumber);

      return {
        id: userId,
        phoneNumber: where.phoneNumber,
      };
    },
  };

  readonly verificationAttempt = {
    create: async () => ({ id: 'attempt_1' }),
    updateMany: async () => ({ count: 1 }),
  };

  readonly draft = {
    create: async ({
      data,
    }: {
      data: Record<string, unknown>;
    }) => {
      this.drafts.set(data.id as string, data);
      return data;
    },
    findFirst: async ({
      where,
    }: {
      where: {
        id: string;
        ownerPhoneNumber: string;
      };
    }) => {
      const draft = this.drafts.get(where.id);

      if (!draft || draft.ownerPhoneNumber !== where.ownerPhoneNumber) {
        return null;
      }

      return draft;
    },
    findUnique: async ({
      where,
      include,
    }: {
      include?: {
        photos?: boolean;
      };
      where: {
        id: string;
      };
    }) => {
      const draft = this.drafts.get(where.id);

      if (!draft) {
        return null;
      }

      return {
        ...draft,
        photos: include?.photos
            ? this.draftPhotosByDraftId.get(where.id) ?? []
            : undefined,
      };
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
      const existingDraft = this.drafts.get(where.id) ?? {};
      const nextDraft = {
        ...existingDraft,
        ...data,
      };
      this.drafts.set(where.id, nextDraft);
      return nextDraft;
    },
  };

  readonly draftPhoto = {
    create: async ({
      data,
    }: {
      data: Record<string, unknown>;
    }) => {
      const draftId = data.draftId as string;
      const currentPhotos = this.draftPhotosByDraftId.get(draftId) ?? [];
      currentPhotos.push(data);
      this.draftPhotosByDraftId.set(draftId, currentPhotos);
      return data;
    },
    deleteMany: async ({
      where,
    }: {
      where: {
        draftId: string;
      };
    }) => {
      this.draftPhotosByDraftId.set(where.draftId, []);
      return { count: 0 };
    },
  };

  readonly listing = {
    findMany: async ({
      where,
    }: {
      where?: {
        moderationStatus?: string;
      };
    } = {}) => {
      return Array.from(this.listings.values()).filter((listing) => {
        if (!where?.moderationStatus) {
          return true;
        }

        return listing.moderationStatus === where.moderationStatus;
      });
    },
    findUnique: async ({
      where,
    }: {
      where: {
        draftId?: string;
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

        if (where.draftId) {
          return listing.draftId === where.draftId;
        }

        return false;
      }) ?? null;
    },
    upsert: async ({
      create,
      update,
      where,
    }: {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
      where: {
        draftId: string;
      };
    }) => {
      const existingListing = Array.from(this.listings.values()).find(
        (listing) => listing.draftId === where.draftId,
      );
      const nextListing = {
        ...existingListing,
        ...(existingListing ? update : create),
        draftId: where.draftId,
        id: (existingListing?.id as string | undefined) ??
          `listing_${where.draftId}`,
      };
      this.listings.set(nextListing.id as string, nextListing);
      return nextListing;
    },
  };

  readonly moderationDecision = {
    findMany: async ({
      include,
      where,
    }: {
      include?: {
        listing?: boolean;
      };
      where?: {
        status?: string;
      };
    } = {}) => {
      return Array.from(this.moderationDecisions.values())
        .filter((decision) => {
          if (!where?.status) {
            return true;
          }

          return decision.status === where.status;
        })
        .map((decision) => ({
          ...decision,
          listing: include?.listing
              ? this.listings.get(decision.listingId as string) ?? null
              : undefined,
        }));
    },
    upsert: async ({
      create,
      update,
      where,
    }: {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
      where: {
        listingId: string;
      };
    }) => {
      const existingDecision = this.moderationDecisions.get(where.listingId);
      const nextDecision = {
        ...existingDecision,
        ...(existingDecision ? update : create),
        id: where.listingId,
        listingId: where.listingId,
      };
      this.moderationDecisions.set(where.listingId, nextDecision);
      return nextDecision;
    },
  };
}

async function createTestApp(): Promise<INestApplication> {
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
  return app;
}

function getPersistedListing(prisma: _FakePrismaService, listingId: string) {
  const listing = prisma.listings.get(listingId);
  assert.ok(listing, `Expected persisted listing ${listingId}.`);
  return listing;
}

function getPersistedModerationDecision(
  prisma: _FakePrismaService,
  listingId: string,
) {
  const decision = prisma.moderationDecisions.get(listingId);
  assert.ok(decision, `Expected persisted moderation decision ${listingId}.`);
  return decision;
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

async function syncDraft(
  app: INestApplication,
  sessionToken: string,
  body: {
    area: string;
    categoryId: string;
    priceCdf: number;
    title: string;
  },
) {
  const response = await request(app.getHttpServer())
    .post('/drafts/sync')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      ...body,
      photos: [
        {
          objectKey: 'draft-photos/phone-front.jpg',
          photoId: 'photo_phone-front',
          publicUrl: 'https://cdn.zwibba.example/draft-photos/phone-front.jpg',
          sourcePresetId: 'phone-front',
          uploadStatus: 'uploaded',
        },
      ],
    })
    .expect(201);

  return response.body as {
    area: string;
    categoryId: string;
    draftId: string;
    ownerPhoneNumber: string;
    priceCdf: number;
    syncStatus: string;
    title: string;
  };
}

test('publishing a synced phone draft persists the listing and moderation decision', async (t) => {
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
  t.after(async () => {
    await app.close();
  });

  const sessionToken = await createSellerSession(app, '+243990000001');
  const syncedDraft = await syncDraft(app, sessionToken, {
    title: 'Samsung Galaxy A54 128 Go',
    categoryId: 'phones_tablets',
    area: 'Lubumbashi Centre',
    priceCdf: 4256000,
  });

  const publishResponse = await request(app.getHttpServer())
    .post('/moderation/publish')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      ...syncedDraft,
      description: 'Téléphone propre, version 128 Go, prêt à l’emploi.',
    })
    .expect(201);

  assert.equal(publishResponse.body.status, 'approved');
  assert.equal(
    publishResponse.body.statusLabel,
    'Annonce approuvée et prête à partager',
  );
  assert.match(publishResponse.body.shareUrl, /\/annonces\/samsung-galaxy-a54-128-go$/);

  const persistedListing = getPersistedListing(prisma, publishResponse.body.id);
  assert.equal(persistedListing.title, 'Samsung Galaxy A54 128 Go');
  assert.equal(persistedListing.slug, 'samsung-galaxy-a54-128-go');
  assert.equal(persistedListing.moderationStatus, 'approved');

  const persistedDecision = getPersistedModerationDecision(
    prisma,
    publishResponse.body.id as string,
  );
  assert.equal(persistedDecision.status, 'approved');
  assert.match(
    persistedDecision.reasonSummary as string,
    /prête à partager/i,
  );
});

test('publishing a synced vehicle draft persists a pending moderation decision', async (t) => {
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
  t.after(async () => {
    await app.close();
  });

  const sessionToken = await createSellerSession(app, '+243990000002');
  const syncedDraft = await syncDraft(app, sessionToken, {
    title: 'Toyota Hilux 2019 4x4',
    categoryId: 'vehicles',
    area: 'Bel Air',
    priceCdf: 18500000,
  });

  const publishResponse = await request(app.getHttpServer())
    .post('/moderation/publish')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      ...syncedDraft,
      description: 'SUV fiable avec papiers en ordre et entretien suivi.',
    })
    .expect(201);

  assert.equal(publishResponse.body.status, 'pending_manual_review');
  assert.equal(
    publishResponse.body.statusLabel,
    'Annonce envoyée en revue manuelle',
  );

  const persistedListing = getPersistedListing(prisma, publishResponse.body.id);
  assert.equal(persistedListing.slug, 'toyota-hilux-2019-4x4');
  assert.equal(persistedListing.moderationStatus, 'pending_manual_review');

  const persistedDecision = getPersistedModerationDecision(
    prisma,
    publishResponse.body.id as string,
  );
  assert.equal(persistedDecision.status, 'pending_manual_review');

  const queueResponse = await request(app.getHttpServer())
    .get('/moderation/queue')
    .expect(200);

  assert.equal(queueResponse.body.items.length, 1);
  assert.equal(queueResponse.body.items[0].id, publishResponse.body.id);
  assert.equal(queueResponse.body.items[0].listingTitle, 'Toyota Hilux 2019 4x4');
  assert.equal(queueResponse.body.items[0].status, 'pending_manual_review');
});

test('publishing a synced draft with missing metadata persists a blocked moderation decision', async (t) => {
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
  t.after(async () => {
    await app.close();
  });

  const sessionToken = await createSellerSession(app, '+243990000003');
  const syncedDraft = await syncDraft(app, sessionToken, {
    title: 'Samsung Galaxy A54 128 Go',
    categoryId: 'phones_tablets',
    area: 'Lubumbashi Centre',
    priceCdf: 4256000,
  });

  const publishResponse = await request(app.getHttpServer())
    .post('/moderation/publish')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      ...syncedDraft,
      description: '',
    })
    .expect(201);

  assert.equal(publishResponse.body.status, 'blocked_needs_fix');
  assert.equal(
    publishResponse.body.statusLabel,
    'Annonce bloquée: informations à corriger',
  );
  assert.match(publishResponse.body.reasonSummary, /description/i);

  const persistedListing = getPersistedListing(prisma, publishResponse.body.id);
  assert.equal(persistedListing.moderationStatus, 'blocked_needs_fix');

  const persistedDecision = getPersistedModerationDecision(
    prisma,
    publishResponse.body.id as string,
  );
  assert.equal(persistedDecision.status, 'blocked_needs_fix');
});

test('publishing rejects prices above the 32-bit beta limit with a clear seller error', async (t) => {
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
  t.after(async () => {
    await app.close();
  });

  const sessionToken = await createSellerSession(app, '+243990000003');
  const syncedDraft = await syncDraft(app, sessionToken, {
    title: 'Melo cake',
    categoryId: 'home_garden',
    area: 'Bel Air',
    priceCdf: 4256000,
  });

  const publishResponse = await request(app.getHttpServer())
    .post('/moderation/publish')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      ...syncedDraft,
      priceCdf: 247891510000,
    })
    .expect(400);

  assert.match(publishResponse.body.message, /2.?147.?483.?647 CDF/i);
});
