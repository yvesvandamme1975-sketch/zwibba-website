import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

type SeededUser = {
  createdAt: Date;
  displayName: string | null;
  id: string;
  phoneNumber: string;
};

type SeededSession = {
  token: string;
  user: SeededUser;
};

type SeededReview = {
  buyerUserId: string;
  comment: string | null;
  id: string;
  listingId: string;
  rating: number;
  sellerPhoneNumber: string;
  sellerReply: string | null;
  sellerReplyAt: Date | null;
};

class _FakePrismaService {
  readonly reviews = new Map<string, SeededReview>();
  readonly sessions = new Map<string, SeededSession>();
  readonly users = new Map<string, SeededUser>();

  readonly session = {
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

  readonly review = {
    findUnique: async ({
      where,
    }: {
      where: {
        id?: string;
      };
    }) => {
      return where.id ? this.reviews.get(where.id) ?? null : null;
    },
    update: async ({
      data,
      where,
    }: {
      data: Partial<Pick<SeededReview, 'sellerReply' | 'sellerReplyAt'>>;
      where: {
        id: string;
      };
    }) => {
      const existing = this.reviews.get(where.id);
      if (!existing) {
        return null;
      }

      const nextReview = {
        ...existing,
        ...data,
      };
      this.reviews.set(where.id, nextReview);
      return nextReview;
    },
  };

  seedUser({
    displayName = null,
    id,
    phoneNumber,
  }: {
    displayName?: string | null;
    id: string;
    phoneNumber: string;
  }) {
    const user = {
      createdAt: new Date('2026-06-23T12:00:00.000Z'),
      displayName,
      id,
      phoneNumber,
    };
    this.users.set(id, user);
    return user;
  }

  seedSession({
    phoneNumber,
    token,
    userId,
  }: {
    phoneNumber: string;
    token: string;
    userId: string;
  }) {
    const user = this.users.get(userId) ?? this.seedUser({ id: userId, phoneNumber });
    const session = {
      token,
      user,
    };
    this.sessions.set(token, session);
    return session;
  }

  seedReview(overrides: Partial<SeededReview> = {}) {
    const review = {
      buyerUserId: 'user_buyer',
      comment: 'Bon vendeur.',
      id: 'review_1',
      listingId: 'listing_1',
      rating: 5,
      sellerPhoneNumber: '+243990000001',
      sellerReply: null,
      sellerReplyAt: null,
      ...overrides,
    };
    this.reviews.set(review.id, review);
    return review;
  }
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
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return {
    app,
    prisma,
  };
}

test('review reply endpoint requires a session', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedReview();

  await request(harness.app.getHttpServer())
    .post('/reviews/review_1/reply')
    .send({
      reply: 'Merci pour votre avis.',
    })
    .expect(401);
});

test('review reply endpoint returns not found for an unknown review', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedSession({
    phoneNumber: '+243990000001',
    token: 'seller_session',
    userId: 'user_seller',
  });

  await request(harness.app.getHttpServer())
    .post('/reviews/review_missing/reply')
    .set('authorization', 'Bearer seller_session')
    .send({
      reply: 'Merci pour votre avis.',
    })
    .expect(404);
});

test('review reply endpoint rejects sessions that are not the reviewed seller', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedReview({
    sellerPhoneNumber: '+243990000001',
  });
  harness.prisma.seedSession({
    phoneNumber: '+243990000002',
    token: 'buyer_session',
    userId: 'user_buyer',
  });

  await request(harness.app.getHttpServer())
    .post('/reviews/review_1/reply')
    .set('authorization', 'Bearer buyer_session')
    .send({
      reply: 'Merci pour votre avis.',
    })
    .expect(403);
});

test('review reply endpoint persists cleaned seller replies', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedReview({
    sellerPhoneNumber: '+243990000001',
  });
  harness.prisma.seedSession({
    phoneNumber: '+243990000001',
    token: 'seller_session',
    userId: 'user_seller',
  });

  const response = await request(harness.app.getHttpServer())
    .post('/reviews/review_1/reply')
    .set('authorization', 'Bearer seller_session')
    .send({
      reply: '  Merci pour votre achat. À bientôt.  ',
    })
    .expect(201);

  assert.equal(response.body.sellerReply, 'Merci pour votre achat. À bientôt.');
  assert.ok(response.body.sellerReplyAt);
  assert.equal(harness.prisma.reviews.get('review_1')?.sellerReply, 'Merci pour votre achat. À bientôt.');
  assert.ok(harness.prisma.reviews.get('review_1')?.sellerReplyAt instanceof Date);
});

test('review reply endpoint overwrites an existing seller reply', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedReview({
    sellerPhoneNumber: '+243990000001',
    sellerReply: 'Ancienne réponse.',
    sellerReplyAt: new Date('2026-06-23T12:00:00.000Z'),
  });
  harness.prisma.seedSession({
    phoneNumber: '+243990000001',
    token: 'seller_session',
    userId: 'user_seller',
  });

  const response = await request(harness.app.getHttpServer())
    .post('/reviews/review_1/reply')
    .set('authorization', 'Bearer seller_session')
    .send({
      reply: 'Réponse mise à jour.',
    })
    .expect(201);

  assert.equal(response.body.sellerReply, 'Réponse mise à jour.');
  assert.equal(harness.prisma.reviews.get('review_1')?.sellerReply, 'Réponse mise à jour.');
});

test('review reply endpoint clears an existing seller reply with an empty reply', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedReview({
    sellerPhoneNumber: '+243990000001',
    sellerReply: 'Réponse précédente.',
    sellerReplyAt: new Date('2026-06-23T12:00:00.000Z'),
  });
  harness.prisma.seedSession({
    phoneNumber: '+243990000001',
    token: 'seller_session',
    userId: 'user_seller',
  });

  const response = await request(harness.app.getHttpServer())
    .post('/reviews/review_1/reply')
    .set('authorization', 'Bearer seller_session')
    .send({
      reply: '   ',
    })
    .expect(201);

  assert.equal(response.body.sellerReply, null);
  assert.equal(response.body.sellerReplyAt, null);
  assert.equal(harness.prisma.reviews.get('review_1')?.sellerReply, null);
  assert.equal(harness.prisma.reviews.get('review_1')?.sellerReplyAt, null);
});
