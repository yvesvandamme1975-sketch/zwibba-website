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
  readonly sessions = new Map<string, {
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
    .send(body)
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

test('publishing a synced phone draft is approved', async (t) => {
  const app = await createTestApp();
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
  assert.match(
    publishResponse.body.shareUrl,
    /\/annonces\/draft_samsung-galaxy-a54-128-go_[a-z0-9]{8}$/,
  );
});

test('publishing a synced vehicle draft is queued for manual review', async (t) => {
  const app = await createTestApp();
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

  const queueResponse = await request(app.getHttpServer())
    .get('/moderation/queue')
    .expect(200);

  assert.equal(queueResponse.body.items.length, 1);
  assert.equal(queueResponse.body.items[0].id, syncedDraft.draftId);
  assert.equal(queueResponse.body.items[0].status, 'pending_manual_review');
});

test('publishing a synced draft with missing sensitive metadata is blocked', async (t) => {
  const app = await createTestApp();
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
});
