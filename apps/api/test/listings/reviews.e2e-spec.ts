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

type SeededListing = {
  id: string;
  ownerPhoneNumber: string;
  slug: string;
  title: string;
};

type SeededReview = {
  buyerUserId: string;
  comment: string | null;
  id: string;
  listingId: string;
  rating: number;
  sellerPhoneNumber: string;
};

class _FakePrismaService {
  readonly listings = new Map<string, SeededListing>();
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

  readonly user = {
    findUnique: async ({
      where,
    }: {
      where: {
        phoneNumber?: string;
      };
    }) => {
      if (where.phoneNumber) {
        return Array.from(this.users.values()).find((user) => user.phoneNumber === where.phoneNumber) ?? null;
      }

      return null;
    },
  };

  readonly listing = {
    findUnique: async ({
      where,
    }: {
      where: {
        slug?: string;
      };
    }) => {
      if (where.slug) {
        return Array.from(this.listings.values()).find((listing) => listing.slug === where.slug) ?? null;
      }

      return null;
    },
  };

  readonly review = {
    upsert: async ({
      create,
      update,
      where,
    }: {
      create: Omit<SeededReview, 'id'>;
      update: Partial<SeededReview>;
      where: {
        buyerUserId_listingId: {
          buyerUserId: string;
          listingId: string;
        };
      };
    }) => {
      const key = `${where.buyerUserId_listingId.buyerUserId}:${where.buyerUserId_listingId.listingId}`;
      const existing = this.reviews.get(key);
      const nextReview = {
        ...(existing ?? {
          ...create,
          id: `review_${this.reviews.size + 1}`,
        }),
        ...(existing ? update : {}),
      };
      this.reviews.set(key, nextReview);
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

  seedListing({
    id,
    ownerPhoneNumber,
    slug,
    title = 'Samsung Galaxy A54',
  }: {
    id: string;
    ownerPhoneNumber: string;
    slug: string;
    title?: string;
  }) {
    const listing = {
      id,
      ownerPhoneNumber,
      slug,
      title,
    };
    this.listings.set(id, listing);
    return listing;
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

test('review submit endpoint requires a session', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedListing({
    id: 'listing_review_1',
    ownerPhoneNumber: '+243990000001',
    slug: 'samsung-a54',
  });

  await request(harness.app.getHttpServer())
    .post('/listings/samsung-a54/reviews')
    .send({
      rating: 5,
      comment: 'Vendeur sérieux.',
    })
    .expect(401);
});

test('review submit endpoint rejects self reviews and invalid ratings', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedUser({
    displayName: 'Boutique Katanga',
    id: 'user_seller',
    phoneNumber: '+243990000001',
  });
  harness.prisma.seedSession({
    phoneNumber: '+243990000001',
    token: 'seller_session',
    userId: 'user_seller',
  });
  harness.prisma.seedUser({
    displayName: 'Acheteur',
    id: 'user_buyer',
    phoneNumber: '+243990000002',
  });
  harness.prisma.seedSession({
    phoneNumber: '+243990000002',
    token: 'buyer_session',
    userId: 'user_buyer',
  });
  harness.prisma.seedListing({
    id: 'listing_review_2',
    ownerPhoneNumber: '+243990000001',
    slug: 'samsung-a54',
  });

  await request(harness.app.getHttpServer())
    .post('/listings/samsung-a54/reviews')
    .set('authorization', 'Bearer seller_session')
    .send({
      rating: 5,
      comment: 'Mon annonce.',
    })
    .expect(400);

  await request(harness.app.getHttpServer())
    .post('/listings/samsung-a54/reviews')
    .set('authorization', 'Bearer buyer_session')
    .send({
      rating: 6,
      comment: 'Très bon vendeur.',
    })
    .expect(400);
});

test('review submit endpoint creates and updates one review per buyer and listing', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  harness.prisma.seedUser({
    displayName: 'Acheteur',
    id: 'user_buyer',
    phoneNumber: '+243990000002',
  });
  harness.prisma.seedSession({
    phoneNumber: '+243990000002',
    token: 'buyer_session',
    userId: 'user_buyer',
  });
  harness.prisma.seedListing({
    id: 'listing_review_3',
    ownerPhoneNumber: '+243990000001',
    slug: 'samsung-a54',
  });

  const createResponse = await request(harness.app.getHttpServer())
    .post('/listings/samsung-a54/reviews')
    .set('authorization', 'Bearer buyer_session')
    .send({
      rating: 4,
      comment: 'Vendeur sérieux.',
    })
    .expect(201);

  assert.equal(createResponse.body.rating, 4);
  assert.equal(harness.prisma.reviews.size, 1);
  assert.equal(
    harness.prisma.reviews.get('user_buyer:listing_review_3')?.sellerPhoneNumber,
    '+243990000001',
  );

  const updateResponse = await request(harness.app.getHttpServer())
    .post('/listings/samsung-a54/reviews')
    .set('authorization', 'Bearer buyer_session')
    .send({
      rating: 5,
      comment: 'Très bon vendeur.',
    })
    .expect(201);

  assert.equal(updateResponse.body.rating, 5);
  assert.equal(harness.prisma.reviews.size, 1);
  assert.equal(
    harness.prisma.reviews.get('user_buyer:listing_review_3')?.comment,
    'Très bon vendeur.',
  );
});
