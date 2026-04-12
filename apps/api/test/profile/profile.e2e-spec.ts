import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { TwilioVerifyService } from '../../src/auth/twilio-verify.service';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { normalizeLocationLabel } from '../../src/locations/location-normalization';

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
  locationOptions = new Map<string, {
    countryCode: string;
    id: string;
    label: string;
    normalizedLabel: string;
    sourceType: string;
    status: string;
    type: string;
  }>();
  sessions = new Map<string, {
    token: string;
    user: {
      area: string;
      id: string;
      phoneNumber: string;
    };
  }>();
  users = new Map<string, {
    area: string;
    id: string;
    phoneNumber: string;
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
      const user = this.users.get(data.userId) ?? {
        area: '',
        id: data.userId,
        phoneNumber: '+243990000001',
      };
      const session = {
        token: data.token,
        user,
      };
      this.sessions.set(session.token, session);
      return {
        token: session.token,
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
    findUnique: async ({
      where,
    }: {
      where: {
        phoneNumber: string;
      };
    }) => {
      return Array.from(this.users.values()).find((user) => user.phoneNumber === where.phoneNumber) ?? null;
    },
    update: async ({
      data,
      where,
    }: {
      data: {
        area: string;
      };
      where: {
        phoneNumber: string;
      };
    }) => {
      const currentUser = Array.from(this.users.values()).find((user) => user.phoneNumber === where.phoneNumber);

      if (!currentUser) {
        throw new Error('User not found');
      }

      const nextUser = {
        ...currentUser,
        area: data.area,
      };
      this.users.set(nextUser.id, nextUser);

      for (const [token, session] of this.sessions.entries()) {
        if (session.user.phoneNumber === where.phoneNumber) {
          this.sessions.set(token, {
            ...session,
            user: nextUser,
          });
        }
      }

      return nextUser;
    },
    upsert: async ({
      where,
    }: {
      where: {
        phoneNumber: string;
      };
    }) => {
      const id = `user_${where.phoneNumber.replaceAll('+', '')}`;
      const existingUser = this.users.get(id);

      if (existingUser) {
        return existingUser;
      }

      const user = {
        area: '',
        id,
        phoneNumber: where.phoneNumber,
      };
      this.users.set(id, user);
      return user;
    },
  };

  readonly locationOption = {
    findFirst: async ({
      where,
    }: {
      where: {
        countryCode: string;
        label?: string;
        normalizedLabel?: string;
        status: string;
        type: string;
      };
    }) => {
      return Array.from(this.locationOptions.values()).find((location) => {
        return location.countryCode === where.countryCode &&
          location.status === where.status &&
          location.type === where.type &&
          (where.label ? location.label === where.label : true) &&
          (where.normalizedLabel ? location.normalizedLabel === where.normalizedLabel : true);
      }) ?? null;
    },
    findUnique: async ({
      where,
    }: {
      where: {
        countryCode_type_normalizedLabel: {
          countryCode: string;
          normalizedLabel: string;
          type: string;
        };
      };
    }) => {
      const key = [
        where.countryCode_type_normalizedLabel.countryCode,
        where.countryCode_type_normalizedLabel.type,
        where.countryCode_type_normalizedLabel.normalizedLabel,
      ].join(':');
      return this.locationOptions.get(key) ?? null;
    },
    upsert: async ({
      create,
      update,
      where,
    }: {
      create: Record<string, string>;
      update: Record<string, string>;
      where: {
        countryCode_type_normalizedLabel: {
          countryCode: string;
          normalizedLabel: string;
          type: string;
        };
      };
    }) => {
      const key = [
        where.countryCode_type_normalizedLabel.countryCode,
        where.countryCode_type_normalizedLabel.type,
        where.countryCode_type_normalizedLabel.normalizedLabel,
      ].join(':');
      const existing = this.locationOptions.get(key);
      const nextValue = existing
        ? {
            ...existing,
            ...update,
          }
        : {
            ...create,
            id: create.id ?? `loc_${where.countryCode_type_normalizedLabel.normalizedLabel}`,
          };
      this.locationOptions.set(key, nextValue as never);
      return nextValue;
    },
  };

  readonly verificationAttempt = {
    create: async () => ({ id: 'attempt_1' }),
    updateMany: async () => ({ count: 1 }),
  };

  readonly walletTransaction = {
    count: async () => 0,
    create: async () => ({ id: 'wallet_tx_1' }),
  };

  seedCity(label: string) {
    const normalizedLabel = normalizeLocationLabel(label);
    this.locationOptions.set(`CD:city:${normalizedLabel}`, {
      countryCode: 'CD',
      id: `loc_${normalizedLabel}`,
      label,
      normalizedLabel,
      sourceType: 'system_seed',
      status: 'active',
      type: 'city',
    });
  }
}

async function createTestApp() {
  const prisma = new _FakePrismaService();
  prisma.seedCity('Lubumbashi');
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

test('profile endpoints return and persist the seller zone for the active session', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const verifyResponse = await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      code: '123456',
      phoneNumber: '+243990000001',
    })
    .expect(201);

  const sessionToken = verifyResponse.body.sessionToken;

  const getBefore = await request(harness.app.getHttpServer())
    .get('/profile')
    .set('authorization', `Bearer ${sessionToken}`)
    .expect(200);

  assert.equal(getBefore.body.phoneNumber, '+243990000001');
  assert.equal(getBefore.body.area, '');

  const saveResponse = await request(harness.app.getHttpServer())
    .post('/profile')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      area: 'Lubumbashi',
    })
    .expect(201);

  assert.equal(saveResponse.body.phoneNumber, '+243990000001');
  assert.equal(saveResponse.body.area, 'Lubumbashi');

  const getAfter = await request(harness.app.getHttpServer())
    .get('/profile')
    .set('authorization', `Bearer ${sessionToken}`)
    .expect(200);

  assert.equal(getAfter.body.area, 'Lubumbashi');
});

test('profile save accepts a newly suggested city after it is added through locations', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const verifyResponse = await request(harness.app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      code: '123456',
      phoneNumber: '+243990000001',
    })
    .expect(201);

  const sessionToken = verifyResponse.body.sessionToken;

  await request(harness.app.getHttpServer())
    .post('/locations/suggestions')
    .send({
      countryCode: 'CD',
      label: 'Kasumbalesa',
      type: 'city',
    })
    .expect(201);

  const saveResponse = await request(harness.app.getHttpServer())
    .post('/profile')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      area: 'Kasumbalesa',
    })
    .expect(201);

  assert.equal(saveResponse.body.area, 'Kasumbalesa');
});
