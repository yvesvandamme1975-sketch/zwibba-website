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
};

type SeededReviewReport = {
  createdAt: Date;
  id: string;
  reason: string;
  reporterUserId: string;
  reviewId: string;
  status: string;
};

class _FakePrismaService {
  readonly reviewReports = new Map<string, SeededReviewReport>();
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
  };

  readonly reviewReport = {
    upsert: async ({
      create,
      update,
      where,
    }: {
      create: {
        reason: string;
        reporterUserId: string;
        reviewId: string;
        status: string;
      };
      update: {
        reason: string;
        status: string;
      };
      where: {
        reviewId_reporterUserId: {
          reporterUserId: string;
          reviewId: string;
        };
      };
    }) => {
      const key = `${where.reviewId_reporterUserId.reviewId}:${where.reviewId_reporterUserId.reporterUserId}`;
      const existing = this.reviewReports.get(key);
      const nextReport = existing
        ? {
            ...existing,
            ...update,
          }
        : {
            ...create,
            createdAt: new Date('2026-06-23T15:00:00.000Z'),
            id: `report_${this.reviewReports.size + 1}`,
          };
      this.reviewReports.set(key, nextReport);
      return nextReport;
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
      comment: 'Très bon vendeur.',
      id: 'review_1',
      listingId: 'listing_1',
      rating: 5,
      sellerPhoneNumber: '+243990000001',
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

test('review report endpoint requires a session', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedReview();

  await request(harness.app.getHttpServer())
    .post('/reviews/review_1/report')
    .send({
      reason: 'spam',
    })
    .expect(401);
});

test('review report endpoint returns not found for an unknown review', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedSession({
    phoneNumber: '+243990000002',
    token: 'buyer_session',
    userId: 'user_buyer',
  });

  await request(harness.app.getHttpServer())
    .post('/reviews/review_missing/report')
    .set('authorization', 'Bearer buyer_session')
    .send({
      reason: 'spam',
    })
    .expect(404);
});

test('review report endpoint rejects unsupported reasons', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedReview();
  harness.prisma.seedSession({
    phoneNumber: '+243990000002',
    token: 'buyer_session',
    userId: 'user_buyer',
  });

  await request(harness.app.getHttpServer())
    .post('/reviews/review_1/report')
    .set('authorization', 'Bearer buyer_session')
    .send({
      reason: 'annoying',
    })
    .expect(400);
});

test('review report endpoint creates a pending report for an allowed reason', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedReview();
  harness.prisma.seedSession({
    phoneNumber: '+243990000002',
    token: 'buyer_session',
    userId: 'user_buyer',
  });

  const response = await request(harness.app.getHttpServer())
    .post('/reviews/review_1/report')
    .set('authorization', 'Bearer buyer_session')
    .send({
      reason: 'fake',
    })
    .expect(201);

  assert.equal(response.body.reviewId, 'review_1');
  assert.equal(response.body.reason, 'fake');
  assert.equal(response.body.status, 'pending');
  assert.equal(harness.prisma.reviewReports.size, 1);
});

test('review report endpoint updates an existing report by the same reporter', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedReview();
  harness.prisma.seedSession({
    phoneNumber: '+243990000002',
    token: 'buyer_session',
    userId: 'user_buyer',
  });

  await request(harness.app.getHttpServer())
    .post('/reviews/review_1/report')
    .set('authorization', 'Bearer buyer_session')
    .send({
      reason: 'spam',
    })
    .expect(201);

  const updateResponse = await request(harness.app.getHttpServer())
    .post('/reviews/review_1/report')
    .set('authorization', 'Bearer buyer_session')
    .send({
      reason: 'offensive',
    })
    .expect(201);

  assert.equal(harness.prisma.reviewReports.size, 1);
  assert.equal(updateResponse.body.reason, 'offensive');
  assert.equal(updateResponse.body.status, 'pending');
});
