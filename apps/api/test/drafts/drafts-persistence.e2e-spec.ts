import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { TwilioVerifyService } from '../../src/auth/twilio-verify.service';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { R2StorageService } from '../../src/media/r2-storage.service';

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
  draftPhotosByDraftId = new Map<string, Array<Record<string, unknown>>>();
  drafts = new Map<string, Record<string, unknown>>();
  listingsByDraftId = new Map<string, Record<string, unknown>>();
  sessions = new Map<string, {
    token: string;
    user: {
      phoneNumber: string;
    };
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
      const session = {
        token: data.token,
        user: {
          phoneNumber: '+243990000001',
        },
      };
      this.sessions.set(session.token, session);
      return {
        ...session,
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
    upsert: async () => {
      return {
        id: 'user_243990000001',
        phoneNumber: '+243990000001',
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
      include,
      where,
    }: {
      include?: {
        listing?: boolean;
        photos?: boolean;
      };
      where: {
        id: string;
        ownerPhoneNumber: string;
      };
    }) => {
      const draft = this.drafts.get(where.id);

      if (!draft || draft.ownerPhoneNumber !== where.ownerPhoneNumber) {
        return null;
      }

      return {
        ...draft,
        listing: include?.listing ? this.listingsByDraftId.get(where.id) ?? null : undefined,
        photos: include?.photos ? this.draftPhotosByDraftId.get(where.id) ?? [] : undefined,
      };
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
    delete: async ({
      where,
    }: {
      where: {
        id: string;
      };
    }) => {
      const draft = this.drafts.get(where.id) ?? null;
      this.drafts.delete(where.id);
      this.draftPhotosByDraftId.delete(where.id);
      return draft;
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
}

class _FakeR2StorageService {
  deletedObjectKeys: string[] = [];

  async deleteObject(objectKey: string) {
    this.deletedObjectKeys.push(objectKey);
  }
}

async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: _FakePrismaService;
  r2StorageService: _FakeR2StorageService;
}> {
  const prisma = new _FakePrismaService();
  const r2StorageService = new _FakeR2StorageService();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(R2StorageService)
    .useValue(r2StorageService)
    .overrideProvider(TwilioVerifyService)
    .useValue(new _FakeTwilioVerifyService())
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return {
    app,
    prisma,
    r2StorageService,
  };
}

test('draft sync persists metadata and photo records', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  const verifyResponse = await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      phoneNumber: '+243990000001',
      code: '123456',
    })
    .expect(201);

  const syncResponse = await request(harness.app.getHttpServer())
    .post('/drafts/sync')
    .set('authorization', `Bearer ${verifyResponse.body.sessionToken}`)
    .send({
      area: 'Lubumbashi Centre',
      attributesJson: {
        fashion: {
          itemType: 'shoes',
          size: '39',
        },
      },
      categoryId: 'phones_tablets',
      condition: 'like_new',
      description: 'Téléphone propre, batterie stable, vendu avec chargeur.',
      priceCdf: 4256000,
      title: 'Samsung Galaxy A54 128 Go',
      photos: [
        {
          objectKey: 'draft-photos/phone-front.jpg',
          publicUrl: 'https://cdn.zwibba.example/draft-photos/phone-front.jpg',
          sourcePresetId: 'phone-front',
          uploadStatus: 'uploaded',
        },
      ],
    })
    .expect(201);

  assert.match(syncResponse.body.draftId, /^draft_/);
  assert.equal(syncResponse.body.syncStatus, 'synced');
  assert.equal(syncResponse.body.description, 'Téléphone propre, batterie stable, vendu avec chargeur.');
  assert.equal(syncResponse.body.condition, 'like_new');
  assert.deepEqual(syncResponse.body.attributesJson, {
    fashion: {
      itemType: 'shoes',
      size: '39',
    },
  });
  assert.equal(syncResponse.body.photos.length, 1);
  assert.equal(syncResponse.body.photos[0].objectKey, 'draft-photos/phone-front.jpg');
  assert.equal(harness.prisma.drafts.size, 1);
  assert.equal(harness.prisma.draftPhotosByDraftId.size, 1);
  const persistedDraft = Array.from(harness.prisma.drafts.values())[0] as Record<string, unknown>;
  assert.equal(persistedDraft.condition, 'like_new');
  assert.deepEqual(persistedDraft.attributesJson, {
    fashion: {
      itemType: 'shoes',
      size: '39',
    },
  });
});

test('draft sync accepts USD listing prices and persists amount plus currency', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  const verifyResponse = await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      phoneNumber: '+243990000001',
      code: '123456',
    })
    .expect(201);

  const syncResponse = await request(harness.app.getHttpServer())
    .post('/drafts/sync')
    .set('authorization', `Bearer ${verifyResponse.body.sessionToken}`)
    .send({
      area: 'Lubumbashi Centre',
      categoryId: 'electronics',
      description: 'MacBook Pro 14 pouces en très bon état.',
      priceAmount: 350,
      priceCurrency: 'USD',
      title: 'MacBook Pro 14',
      photos: [
        {
          objectKey: 'draft-photos/macbook-front.jpg',
          publicUrl: 'https://cdn.zwibba.example/draft-photos/macbook-front.jpg',
          sourcePresetId: 'capture',
          uploadStatus: 'uploaded',
        },
      ],
    })
    .expect(201);

  assert.equal(syncResponse.body.priceAmount, 350);
  assert.equal(syncResponse.body.priceCurrency, 'USD');

  const persistedDraft = Array.from(harness.prisma.drafts.values())[0] as Record<string, unknown>;
  assert.equal(persistedDraft.priceAmount, 350);
  assert.equal(persistedDraft.priceCurrency, 'USD');
});

test('draft sync rejects prices above the 32-bit beta limit with a clear seller error', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  const verifyResponse = await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      phoneNumber: '+243990000001',
      code: '123456',
    })
    .expect(201);

  const syncResponse = await request(harness.app.getHttpServer())
    .post('/drafts/sync')
    .set('authorization', `Bearer ${verifyResponse.body.sessionToken}`)
    .send({
      area: 'Bel Air',
      categoryId: 'home_garden',
      description: 'Gâteau sur commande.',
      priceCdf: 247891510000,
      title: 'Melo cake',
      photos: [
        {
          objectKey: 'draft-photos/cake-front.jpg',
          publicUrl: 'https://cdn.zwibba.example/draft-photos/cake-front.jpg',
          sourcePresetId: 'cake-front',
          uploadStatus: 'uploaded',
        },
      ],
    })
    .expect(400);

  assert.match(syncResponse.body.message, /2.?147.?483.?647 CDF/i);
});

test('draft delete removes the seller draft and uploaded photo objects', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  const verifyResponse = await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      phoneNumber: '+243990000001',
      code: '123456',
    })
    .expect(201);

  const syncResponse = await request(harness.app.getHttpServer())
    .post('/drafts/sync')
    .set('authorization', `Bearer ${verifyResponse.body.sessionToken}`)
    .send({
      area: 'Lubumbashi Centre',
      categoryId: 'phones_tablets',
      description: 'Téléphone propre, batterie stable, vendu avec chargeur.',
      priceCdf: 4256000,
      title: 'Samsung Galaxy A54 128 Go',
      photos: [
        {
          objectKey: 'draft-photos/phone-front.jpg',
          publicUrl: 'https://cdn.zwibba.example/draft-photos/phone-front.jpg',
          sourcePresetId: 'phone-front',
          uploadStatus: 'uploaded',
        },
        {
          objectKey: 'draft-photos/phone-back.jpg',
          publicUrl: 'https://cdn.zwibba.example/draft-photos/phone-back.jpg',
          sourcePresetId: 'phone-back',
          uploadStatus: 'uploaded',
        },
      ],
    })
    .expect(201);

  const deleteResponse = await request(harness.app.getHttpServer())
    .delete(`/drafts/${syncResponse.body.draftId}`)
    .set('authorization', `Bearer ${verifyResponse.body.sessionToken}`)
    .expect(200);

  assert.deepEqual(deleteResponse.body, {
    draftId: syncResponse.body.draftId,
    status: 'deleted',
  });
  assert.equal(harness.prisma.drafts.size, 0);
  assert.equal(harness.prisma.draftPhotosByDraftId.has(syncResponse.body.draftId), false);
  assert.deepEqual(harness.r2StorageService.deletedObjectKeys, [
    'draft-photos/phone-front.jpg',
    'draft-photos/phone-back.jpg',
  ]);
});

test('draft delete refuses to remove a draft that already has a published listing', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  await request(harness.app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  const verifyResponse = await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      phoneNumber: '+243990000001',
      code: '123456',
    })
    .expect(201);

  harness.prisma.drafts.set('draft_published_1', {
    area: 'Bel Air',
    categoryId: 'phones_tablets',
    condition: 'used_good',
    description: 'Téléphone déjà publié.',
    id: 'draft_published_1',
    ownerPhoneNumber: '+243990000001',
    priceCdf: 4256000,
    title: 'Samsung Galaxy A54',
  });
  harness.prisma.listingsByDraftId.set('draft_published_1', {
    id: 'listing_1',
    draftId: 'draft_published_1',
    slug: 'samsung-galaxy-a54',
  });

  const deleteResponse = await request(harness.app.getHttpServer())
    .delete('/drafts/draft_published_1')
    .set('authorization', `Bearer ${verifyResponse.body.sessionToken}`)
    .expect(409);

  assert.match(deleteResponse.body.message, /déjà publiée/i);
  assert.equal(harness.prisma.drafts.has('draft_published_1'), true);
});
