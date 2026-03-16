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
  draftPhotosByDraftId = new Map<string, Array<Record<string, unknown>>>();
  drafts = new Map<string, Record<string, unknown>>();
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
}

async function createTestApp(): Promise<{
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
      ],
    })
    .expect(201);

  assert.match(syncResponse.body.draftId, /^draft_/);
  assert.equal(syncResponse.body.syncStatus, 'synced');
  assert.equal(syncResponse.body.description, 'Téléphone propre, batterie stable, vendu avec chargeur.');
  assert.equal(syncResponse.body.photos.length, 1);
  assert.equal(syncResponse.body.photos[0].objectKey, 'draft-photos/phone-front.jpg');
  assert.equal(harness.prisma.drafts.size, 1);
  assert.equal(harness.prisma.draftPhotosByDraftId.size, 1);
});
