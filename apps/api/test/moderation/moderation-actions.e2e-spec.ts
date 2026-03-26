import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

class _FakePrismaService {
  readonly listings = new Map<string, {
    id: string;
    moderationStatus: string;
    ownerPhoneNumber: string;
    slug: string;
    title: string;
  }>();
  readonly moderationDecisions = new Map<string, {
    actorLabel: string;
    listingId: string;
    reasonSummary: string;
    status: string;
  }>();

  seedListing(listing: {
    id: string;
    moderationStatus: string;
    ownerPhoneNumber: string;
    slug: string;
    title: string;
  }) {
    this.listings.set(listing.id, listing);
  }

  seedDecision(decision: {
    actorLabel: string;
    listingId: string;
    reasonSummary: string;
    status: string;
  }) {
    this.moderationDecisions.set(decision.listingId, decision);
  }

  readonly listing = {
    findUnique: async ({
      where,
    }: {
      where: {
        id?: string;
        slug?: string;
      };
    }) => {
      if (where.id) {
        return this.listings.get(where.id) ?? null;
      }

      return Array.from(this.listings.values()).find((listing) => {
        return listing.slug === where.slug;
      }) ?? null;
    },
    update: async ({
      data,
      where,
    }: {
      data: {
        moderationStatus: string;
        publishedAt?: Date | null;
      };
      where: {
        id: string;
      };
    }) => {
      const current = this.listings.get(where.id);

      if (!current) {
        return null;
      }

      const next = {
        ...current,
        ...data,
      };
      this.listings.set(where.id, next);
      return next;
    },
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
  };

  readonly moderationDecision = {
    findMany: async ({
      where,
    }: {
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
          listing: this.listings.get(decision.listingId) ?? null,
        }));
    },
    upsert: async ({
      create,
      update,
      where,
    }: {
      create: {
        actorLabel: string;
        listingId: string;
        reasonSummary: string;
        status: string;
      };
      update: {
        actorLabel: string;
        reasonSummary: string;
        status: string;
      };
      where: {
        listingId: string;
      };
    }) => {
      const existing = this.moderationDecisions.get(where.listingId);
      const next = existing
        ? {
            ...existing,
            ...update,
          }
        : create;

      this.moderationDecisions.set(where.listingId, next);
      return next;
    },
  };
}

async function createTestApp(prisma: _FakePrismaService): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

test('moderation actions require the admin secret and update listing state', async (t) => {
  const snapshot = { ...process.env };
  process.env.APP_BASE_URL = 'https://zwibba.example';
  process.env.DATABASE_URL = 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba';
  process.env.DEMO_OTP_ALLOWLIST = '+243990000001';
  process.env.DEMO_OTP_CODE = '123456';
  process.env.NODE_ENV = 'production';
  process.env.OTP_PROVIDER = 'demo';
  process.env.PORT = '3200';
  process.env.R2_ACCESS_KEY_ID = 'r2-access-key';
  process.env.R2_ACCOUNT_ID = 'r2-account';
  process.env.R2_BUCKET = 'zwibba-media';
  process.env.R2_PUBLIC_BASE_URL = 'https://cdn.zwibba.example';
  process.env.R2_S3_ENDPOINT = 'https://r2.example.com';
  process.env.R2_SECRET_ACCESS_KEY = 'r2-secret';
  process.env.ZWIBBA_ADMIN_SHARED_SECRET = 'zwibba-admin-secret';
  t.after(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(snapshot)) {
      if (value === undefined) {
        delete process.env[key];
        continue;
      }
      process.env[key] = value;
    }
  });

  const prisma = new _FakePrismaService();
  prisma.seedListing({
    id: 'listing_pending',
    moderationStatus: 'pending_manual_review',
    ownerPhoneNumber: '+243990000001',
    slug: 'toyota-hilux-2019-4x4',
    title: 'Toyota Hilux 2019 4x4',
  });
  prisma.seedDecision({
    actorLabel: 'system',
    listingId: 'listing_pending',
    reasonSummary: 'Documents véhicule à vérifier',
    status: 'pending_manual_review',
  });

  const app = await createTestApp(prisma);
  t.after(async () => {
    await app.close();
  });

  await request(app.getHttpServer())
    .post('/moderation/listing_pending/approve')
    .expect(401);

  const approveResponse = await request(app.getHttpServer())
    .post('/moderation/listing_pending/approve')
    .set('x-zwibba-admin-secret', 'zwibba-admin-secret')
    .expect(201);

  assert.equal(approveResponse.body.status, 'approved');
  assert.equal(prisma.listings.get('listing_pending')?.moderationStatus, 'approved');

  prisma.seedListing({
    id: 'listing_block_me',
    moderationStatus: 'pending_manual_review',
    ownerPhoneNumber: '+243990000002',
    slug: 'appartement-2-chambres',
    title: 'Appartement 2 chambres',
  });
  prisma.seedDecision({
    actorLabel: 'system',
    listingId: 'listing_block_me',
    reasonSummary: 'Annonce envoyée en revue manuelle',
    status: 'pending_manual_review',
  });

  const blockResponse = await request(app.getHttpServer())
    .post('/moderation/listing_block_me/block')
    .set('x-zwibba-admin-secret', 'zwibba-admin-secret')
    .send({
      reasonSummary: 'Photos insuffisantes pour publier.',
    })
    .expect(201);

  assert.equal(blockResponse.body.status, 'blocked_needs_fix');
  assert.equal(prisma.listings.get('listing_block_me')?.moderationStatus, 'blocked_needs_fix');
  assert.equal(
    prisma.moderationDecisions.get('listing_block_me')?.reasonSummary,
    'Photos insuffisantes pour publier.',
  );
});
