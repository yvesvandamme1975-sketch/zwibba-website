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
  readonly users = new Map<string, string>();

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
      const nextDraft = {
        ...(this.drafts.get(where.id) ?? {}),
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
      const listingId = (existingListing?.id as string | undefined) ??
        `listing_${where.draftId}`;
      const nextListing = {
        ...existingListing,
        ...(existingListing ? update : create),
        draftId: where.draftId,
        id: listingId,
      };
      this.listings.set(listingId, nextListing);
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

async function createTestContext(): Promise<{
  app: INestApplication;
  prisma: _FakePrismaService;
}> {
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

async function publishListing(
  app: INestApplication,
  payload: {
    area: string;
    categoryId: string;
    description: string;
    phoneNumber: string;
    priceCdf: number;
    title: string;
  },
) {
  await request(app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: payload.phoneNumber })
    .expect(201);

  const verifyResponse = await request(app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      phoneNumber: payload.phoneNumber,
      code: '123456',
    })
    .expect(201);

  const syncResponse = await request(app.getHttpServer())
    .post('/drafts/sync')
    .set('authorization', `Bearer ${verifyResponse.body.sessionToken}`)
    .send({
      area: payload.area,
      categoryId: payload.categoryId,
      description: payload.description,
      photos: [
        {
          objectKey: 'draft-photos/phone-front.jpg',
          photoId: 'photo_phone-front',
          publicUrl: 'https://cdn.zwibba.example/draft-photos/phone-front.jpg',
          sourcePresetId: 'phone-front',
          uploadStatus: 'uploaded',
        },
      ],
      priceCdf: payload.priceCdf,
      title: payload.title,
    })
    .expect(201);

  return request(app.getHttpServer())
    .post('/moderation/publish')
    .set('authorization', `Bearer ${verifyResponse.body.sessionToken}`)
    .send({
      ...syncResponse.body,
      description: payload.description,
    })
    .expect(201);
}

test('listings feed returns newly approved database-backed listings only', async (t) => {
  const {
    app,
  } = await createTestContext();
  t.after(async () => {
    await app.close();
  });

  await publishListing(app, {
    area: 'Lubumbashi Centre',
    categoryId: 'phones_tablets',
    description: 'Téléphone propre, batterie stable, vendu avec chargeur.',
    phoneNumber: '+243990000001',
    priceCdf: 4256000,
    title: 'Samsung Galaxy A54 128 Go',
  });
  await publishListing(app, {
    area: 'Bel Air',
    categoryId: 'vehicles',
    description: 'SUV fiable avec papiers en ordre et entretien suivi.',
    phoneNumber: '+243990000002',
    priceCdf: 18500000,
    title: 'Toyota Hilux 2019 4x4',
  });

  const response = await request(app.getHttpServer())
    .get('/listings')
    .expect(200);

  assert.deepEqual(response.body.items.map((item: { slug: string }) => item.slug), [
    'samsung-galaxy-a54-128-go',
  ]);
  assert.equal(response.body.items[0].categoryLabel, 'Téléphones & Tablettes');
  assert.equal(response.body.items[0].priceCdf, 4256000);
  assert.equal(response.body.items[0].locationLabel, 'Lubumbashi Centre');
  assert.equal(
    response.body.items[0].primaryImageUrl,
    'https://cdn.zwibba.example/draft-photos/phone-front.jpg',
  );
});

test('listing detail returns a database-backed published listing with seller metadata', async (t) => {
  const {
    app,
  } = await createTestContext();
  t.after(async () => {
    await app.close();
  });

  await publishListing(app, {
    area: 'Lubumbashi Centre',
    categoryId: 'phones_tablets',
    description: 'Téléphone propre, batterie stable, vendu avec chargeur.',
    phoneNumber: '+243990000001',
    priceCdf: 4256000,
    title: 'Samsung Galaxy A54 128 Go',
  });

  const response = await request(app.getHttpServer())
    .get('/listings/samsung-galaxy-a54-128-go')
    .expect(200);

  assert.equal(response.body.slug, 'samsung-galaxy-a54-128-go');
  assert.equal(response.body.title, 'Samsung Galaxy A54 128 Go');
  assert.equal(response.body.locationLabel, 'Lubumbashi Centre');
  assert.equal(response.body.priceCdf, 4256000);
  assert.ok(Array.isArray(response.body.contactActions));
  assert.deepEqual(response.body.contactActions, [
    'whatsapp',
    'sms',
    'call',
  ]);
  assert.ok(Array.isArray(response.body.safetyTips));
  assert.match(response.body.seller.name, /\S+/);
  assert.match(response.body.seller.responseTime, /\S+/);
  assert.equal(
    response.body.primaryImageUrl,
    'https://cdn.zwibba.example/draft-photos/phone-front.jpg',
  );
});

test('listings without uploaded photos still return a null primary image', async (t) => {
  const {
    app,
    prisma,
  } = await createTestContext();
  t.after(async () => {
    await app.close();
  });

  prisma.drafts.set('draft_no_photo', {
    area: 'Kenya',
    categoryId: 'electronics',
    condition: 'used_good',
    description: 'Console en bon état.',
    id: 'draft_no_photo',
    ownerPhoneNumber: '+243990000003',
    priceCdf: 980000,
    syncStatus: 'synced',
    title: 'PlayStation 4 Slim',
  });
  prisma.listings.set('listing_draft_no_photo', {
    area: 'Kenya',
    categoryId: 'electronics',
    description: 'Console en bon état.',
    draftId: 'draft_no_photo',
    id: 'listing_draft_no_photo',
    moderationStatus: 'approved',
    ownerPhoneNumber: '+243990000003',
    priceCdf: 980000,
    publishedAt: new Date('2026-03-22T10:00:00.000Z'),
    slug: 'playstation-4-slim',
    title: 'PlayStation 4 Slim',
    updatedAt: new Date('2026-03-22T10:00:00.000Z'),
  });

  const feedResponse = await request(app.getHttpServer())
    .get('/listings')
    .expect(200);
  const detailResponse = await request(app.getHttpServer())
    .get('/listings/playstation-4-slim')
    .expect(200);

  const listing = feedResponse.body.items.find(
    (item: { slug: string }) => item.slug === 'playstation-4-slim',
  );

  assert.equal(listing.primaryImageUrl, null);
  assert.equal(detailResponse.body.primaryImageUrl, null);
});
