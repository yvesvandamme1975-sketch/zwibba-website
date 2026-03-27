import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

type UserRecord = {
  birthDate: string | null;
  countryCode: string | null;
  email: string | null;
  firstName: string | null;
  id: string;
  lastName: string | null;
  locality: string | null;
  phoneNumber: string;
  postNom: string | null;
  profileCompletedAt: Date | null;
};

class _FakePrismaService {
  readonly sessions = new Map<string, {
    token: string;
    user: UserRecord;
  }>();
  readonly users = new Map<string, UserRecord>();

  seedSession(overrides: Partial<UserRecord> = {}) {
    const user = {
      birthDate: null,
      countryCode: null,
      email: null,
      firstName: null,
      id: 'user_243990000001',
      lastName: null,
      locality: null,
      phoneNumber: '+243990000001',
      postNom: null,
      profileCompletedAt: null,
      ...overrides,
    } satisfies UserRecord;
    const token = 'zwibba_session_seeded_profile';

    this.users.set(user.id, user);
    this.sessions.set(token, {
      token,
      user,
    });

    return {
      token,
      user,
    };
  }

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
        id?: string;
        phoneNumber?: string;
      };
    }) => {
      if (where.id) {
        return this.users.get(where.id) ?? null;
      }

      return Array.from(this.users.values()).find((user) => {
        return user.phoneNumber === where.phoneNumber;
      }) ?? null;
    },
    update: async ({
      data,
      where,
    }: {
      data: Partial<UserRecord>;
      where: {
        id: string;
      };
    }) => {
      const existingUser = this.users.get(where.id);

      if (!existingUser) {
        throw new Error(`Unknown user ${where.id}`);
      }

      const updatedUser = {
        ...existingUser,
        ...data,
      };

      this.users.set(where.id, updatedUser);

      for (const [token, session] of this.sessions.entries()) {
        if (session.user.id === where.id) {
          this.sessions.set(token, {
            ...session,
            user: updatedUser,
          });
        }
      }

      return updatedUser;
    },
  };
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

test('auth me returns the current account payload', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const seeded = harness.prisma.seedSession();
  const response = await request(harness.app.getHttpServer())
    .get('/auth/me')
    .set('authorization', `Bearer ${seeded.token}`)
    .expect(200);

  assert.equal(response.body.user.phoneNumber, '+243990000001');
  assert.deepEqual(response.body.requiredActions, ['complete_profile']);
});

test('account profile rejects incomplete updates', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const seeded = harness.prisma.seedSession();
  const response = await request(harness.app.getHttpServer())
    .put('/account/profile')
    .set('authorization', `Bearer ${seeded.token}`)
    .send({
      email: 'amina@example.com',
    })
    .expect(400);

  assert.match(response.body.message, /pr[ée]nom/i);
});

test('account profile completion clears the complete_profile requirement', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const seeded = harness.prisma.seedSession();
  const response = await request(harness.app.getHttpServer())
    .put('/account/profile')
    .set('authorization', `Bearer ${seeded.token}`)
    .send({
      birthDate: '1998-04-12',
      countryCode: 'CD',
      email: 'amina@example.com',
      firstName: 'Amina',
      lastName: 'Kasongo',
      locality: 'Lubumbashi',
      postNom: 'Muteba',
    })
    .expect(200);

  assert.deepEqual(response.body.requiredActions, []);
  assert.equal(response.body.user.email, 'amina@example.com');
  assert.equal(response.body.user.isProfileComplete, true);
});

test('account profile rejects non-African country codes', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const seeded = harness.prisma.seedSession();
  const response = await request(harness.app.getHttpServer())
    .put('/account/profile')
    .set('authorization', `Bearer ${seeded.token}`)
    .send({
      birthDate: '1998-04-12',
      countryCode: 'FR',
      email: 'amina@example.com',
      firstName: 'Amina',
      lastName: 'Kasongo',
      locality: 'Paris',
      postNom: 'Muteba',
    })
    .expect(400);

  assert.match(response.body.message, /afri/i);
});

test('account profile rejects future birth dates', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const seeded = harness.prisma.seedSession();
  const futureBirthDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const response = await request(harness.app.getHttpServer())
    .put('/account/profile')
    .set('authorization', `Bearer ${seeded.token}`)
    .send({
      birthDate: futureBirthDate,
      countryCode: 'CD',
      email: 'amina@example.com',
      firstName: 'Amina',
      lastName: 'Kasongo',
      locality: 'Lubumbashi',
      postNom: 'Muteba',
    })
    .expect(400);

  assert.match(response.body.message, /naissance/i);
});
