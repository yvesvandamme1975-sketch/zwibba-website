import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

type SeededReview = {
  buyerUserId: string;
  comment: string | null;
  id: string;
  listing: {
    id: string;
    ownerPhoneNumber: string;
    slug: string;
    title: string;
  };
  listingId: string;
  rating: number;
  sellerPhoneNumber: string;
};

type SeededReviewReport = {
  createdAt: Date;
  id: string;
  reason: string;
  reporterUserId: string;
  review: SeededReview;
  reviewId: string;
  status: string;
};

class _FakePrismaService {
  readonly reviewReports = new Map<string, SeededReviewReport>();
  readonly reviews = new Map<string, SeededReview>();

  readonly review = {
    delete: async ({
      where,
    }: {
      where: {
        id: string;
      };
    }) => {
      const existing = this.reviews.get(where.id);
      if (!existing) {
        return null;
      }

      this.reviews.delete(where.id);
      for (const [reportId, report] of this.reviewReports.entries()) {
        if (report.reviewId === where.id) {
          this.reviewReports.delete(reportId);
        }
      }
      return existing;
    },
  };

  readonly reviewReport = {
    findMany: async ({
      where,
    }: {
      where?: {
        status?: string;
      };
    } = {}) => {
      return Array.from(this.reviewReports.values())
        .filter((report) => {
          if (!where?.status) {
            return true;
          }

          return report.status === where.status;
        })
        .map((report) => ({
          ...report,
          review: this.reviews.get(report.reviewId) ?? report.review,
        }));
    },
    findUnique: async ({
      where,
    }: {
      where: {
        id: string;
      };
    }) => {
      const report = this.reviewReports.get(where.id);
      if (!report) {
        return null;
      }

      return {
        ...report,
        review: this.reviews.get(report.reviewId) ?? report.review,
      };
    },
    update: async ({
      data,
      where,
    }: {
      data: {
        status: string;
      };
      where: {
        id: string;
      };
    }) => {
      const existing = this.reviewReports.get(where.id);
      if (!existing) {
        return null;
      }

      const nextReport = {
        ...existing,
        ...data,
      };
      this.reviewReports.set(where.id, nextReport);
      return nextReport;
    },
  };

  seedReviewReport(overrides: Partial<SeededReviewReport> = {}) {
    const review = overrides.review ?? {
      buyerUserId: 'user_buyer',
      comment: 'Le vendeur a annulé après paiement avec un ton agressif.',
      id: 'review_1',
      listing: {
        id: 'listing_1',
        ownerPhoneNumber: '+243990000001',
        slug: 'samsung-a54',
        title: 'Samsung A54',
      },
      listingId: 'listing_1',
      rating: 1,
      sellerPhoneNumber: '+243990000001',
    };
    const report = {
      createdAt: new Date('2026-06-23T15:30:00.000Z'),
      id: 'report_1',
      reason: 'fake',
      reporterUserId: 'user_reporter',
      review,
      reviewId: review.id,
      status: 'pending',
      ...overrides,
    };
    this.reviews.set(review.id, review);
    this.reviewReports.set(report.id, report);
    return report;
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

test('admin review reports queue lists pending reports with review context', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedReviewReport();
  harness.prisma.seedReviewReport({
    id: 'report_dismissed',
    review: {
      buyerUserId: 'user_buyer_2',
      comment: 'Ancien signalement déjà traité.',
      id: 'review_2',
      listing: {
        id: 'listing_2',
        ownerPhoneNumber: '+243990000003',
        slug: 'table-bois',
        title: 'Table bois',
      },
      listingId: 'listing_2',
      rating: 4,
      sellerPhoneNumber: '+243990000003',
    },
    reviewId: 'review_2',
    status: 'dismissed',
  });

  const response = await request(harness.app.getHttpServer())
    .get('/review-reports/queue')
    .expect(200);

  assert.deepEqual(response.body.items, [
    {
      commentExcerpt: 'Le vendeur a annulé après paiement avec un ton agressif.',
      createdAt: '2026-06-23T15:30:00.000Z',
      id: 'report_1',
      rating: 1,
      reason: 'fake',
      reviewId: 'review_1',
      seller: {
        listingSlug: 'samsung-a54',
        listingTitle: 'Samsung A54',
      },
    },
  ]);
  assert.equal(JSON.stringify(response.body).includes('+243'), false);
});

test('admin review reports dismiss marks a report dismissed and removes it from the queue', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedReviewReport();

  await request(harness.app.getHttpServer())
    .post('/review-reports/report_1/dismiss')
    .expect(201);

  assert.equal(harness.prisma.reviewReports.get('report_1')?.status, 'dismissed');

  const queueResponse = await request(harness.app.getHttpServer())
    .get('/review-reports/queue')
    .expect(200);

  assert.deepEqual(queueResponse.body.items, []);
});

test('admin review reports remove-review deletes the targeted review and closes reports', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedReviewReport();

  await request(harness.app.getHttpServer())
    .post('/review-reports/report_1/remove-review')
    .expect(201);

  assert.equal(harness.prisma.reviews.has('review_1'), false);
  assert.equal(harness.prisma.reviewReports.has('report_1'), false);

  const queueResponse = await request(harness.app.getHttpServer())
    .get('/review-reports/queue')
    .expect(200);

  assert.deepEqual(queueResponse.body.items, []);
});
