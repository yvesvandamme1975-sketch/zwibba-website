import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

class _FakePrismaService {
  readonly draftPhotosByDraftId = new Map<string, Array<Record<string, unknown>>>();
  readonly listings = new Map<string, Record<string, unknown>>();
  readonly users = new Map<string, {
    createdAt: Date;
    displayName: string | null;
    id: string;
    phoneNumber: string;
  }>();

  readonly user = {
    findUnique: async ({
      where,
    }: {
      where: {
        id?: string;
        phoneNumber?: string;
      };
    }) => {
      if (where.id) {
        return this.users.get(where.id) ?? null;
      }

      if (where.phoneNumber) {
        return Array.from(this.users.values()).find((user) => user.phoneNumber === where.phoneNumber) ?? null;
      }

      return null;
    },
  };

  readonly draft = {
    findUnique: async ({
      include,
      where,
    }: {
      include?: {
        photos?: boolean;
      };
      where: {
        id: string;
      };
    }) => {
      return {
        id: where.id,
        photos: include?.photos
          ? this.draftPhotosByDraftId.get(where.id) ?? []
          : undefined,
      };
    },
  };

  readonly listing = {
    findMany: async ({
      where,
    }: {
      where?: {
        moderationStatus?: string;
        ownerPhoneNumber?: string;
      };
    } = {}) => {
      return Array.from(this.listings.values()).filter((listing) => {
        if (where?.ownerPhoneNumber && listing.ownerPhoneNumber !== where.ownerPhoneNumber) {
          return false;
        }

        if (where?.moderationStatus && listing.moderationStatus !== where.moderationStatus) {
          return false;
        }

        return true;
      });
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
    this.users.set(id, {
      createdAt: new Date('2026-06-01T09:30:00.000Z'),
      displayName,
      id,
      phoneNumber,
    });
  }

  seedListing({
    draftId,
    id,
    lifecycleStatus = 'active',
    moderationStatus = 'approved',
    ownerPhoneNumber = '+243990000001',
    slug,
    title,
  }: {
    draftId: string;
    id: string;
    lifecycleStatus?: string;
    moderationStatus?: string;
    ownerPhoneNumber?: string;
    slug: string;
    title: string;
  }) {
    this.listings.set(id, {
      area: 'Lubumbashi Centre',
      categoryId: 'phones_tablets',
      description: 'Téléphone propre avec chargeur.',
      draftId,
      id,
      lifecycleStatus,
      moderationStatus,
      ownerPhoneNumber,
      phoneNumber: ownerPhoneNumber,
      priceAmount: 4256000,
      priceCdf: 4256000,
      privateNote: 'appel uniquement',
      slug,
      title,
      updatedAt: new Date('2026-06-15T08:00:00.000Z'),
    });
    this.draftPhotosByDraftId.set(draftId, [
      {
        id: `photo_${id}`,
        publicUrl: `https://cdn.zwibba.example/${slug}.jpg`,
        sourcePresetId: 'capture',
        uploadStatus: 'uploaded',
      },
    ]);
  }
}

async function createTestApp() {
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

test('public seller endpoint returns identity and active approved listings only', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedUser({
    displayName: 'Boutique Katanga',
    id: 'user_public_1',
    phoneNumber: '+243990000001',
  });
  harness.prisma.seedListing({
    draftId: 'draft_active',
    id: 'listing_active',
    slug: 'samsung-a54',
    title: 'Samsung A54',
  });
  harness.prisma.seedListing({
    draftId: 'draft_paused',
    id: 'listing_paused',
    lifecycleStatus: 'paused',
    slug: 'iphone-pause',
    title: 'iPhone pause',
  });
  harness.prisma.seedListing({
    draftId: 'draft_sold',
    id: 'listing_sold',
    lifecycleStatus: 'sold',
    slug: 'tecno-vendu',
    title: 'Tecno vendu',
  });
  harness.prisma.seedListing({
    draftId: 'draft_deleted',
    id: 'listing_deleted',
    lifecycleStatus: 'deleted_by_seller',
    slug: 'nokia-supprime',
    title: 'Nokia supprimé',
  });
  harness.prisma.seedListing({
    draftId: 'draft_pending',
    id: 'listing_pending',
    moderationStatus: 'pending_manual_review',
    slug: 'oppo-attente',
    title: 'Oppo attente',
  });
  harness.prisma.seedListing({
    draftId: 'draft_blocked',
    id: 'listing_blocked',
    moderationStatus: 'blocked_needs_fix',
    slug: 'infinix-bloque',
    title: 'Infinix bloqué',
  });
  harness.prisma.seedListing({
    draftId: 'draft_other',
    id: 'listing_other',
    ownerPhoneNumber: '+243990000002',
    slug: 'autre-vendeur',
    title: 'Autre vendeur',
  });

  const response = await request(harness.app.getHttpServer())
    .get('/sellers/user_public_1')
    .expect(200);

  assert.equal(response.body.seller.displayName, 'Boutique Katanga');
  assert.equal(response.body.seller.memberSince, '2026-06-01T09:30:00.000Z');
  assert.deepEqual(response.body.listings.map((listing: { id: string }) => listing.id), [
    'listing_active',
  ]);
  assert.equal(response.body.listings[0].title, 'Samsung A54');
  assert.equal(response.body.listings[0].primaryImageUrl, 'https://cdn.zwibba.example/samsung-a54.jpg');
  assert.equal(response.body.listings[0].ownerPhoneNumber, undefined);
  assert.equal(response.body.listings[0].phoneNumber, undefined);
  assert.equal(response.body.listings[0].privateNote, undefined);
});

test('public seller endpoint uses fallback identity and returns empty listings', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedUser({
    id: 'user_empty',
    phoneNumber: '+243990000050',
  });

  const response = await request(harness.app.getHttpServer())
    .get('/sellers/user_empty')
    .expect(200);

  assert.equal(response.body.seller.displayName, 'Vendeur Zwibba');
  assert.equal(response.body.seller.memberSince, '2026-06-01T09:30:00.000Z');
  assert.deepEqual(response.body.listings, []);
});

test('public seller endpoint returns 404 for unknown sellers', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  await request(harness.app.getHttpServer())
    .get('/sellers/user_unknown')
    .expect(404);
});
