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

class _FakeTwilioVerifyService {}

class _FakePrismaService {
  readonly locationOptions = new Map<string, {
    countryCode: string;
    id: string;
    label: string;
    normalizedLabel: string;
    sourceType: string;
    status: string;
    type: string;
  }>();

  readonly locationOption = {
    findMany: async ({
      where,
    }: {
      where: {
        countryCode: string;
        status: string;
        type: string;
      };
    }) => {
      return Array.from(this.locationOptions.values())
        .filter((location) => {
          return location.countryCode === where.countryCode &&
            location.status === where.status &&
            location.type === where.type;
        })
        .sort((left, right) => left.label.localeCompare(right.label, 'fr'));
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
  prisma.seedCity('Likasi');

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

test('locations endpoints list seeded CD cities and create user suggestions without duplicates', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const listResponse = await request(harness.app.getHttpServer())
    .get('/locations/cities')
    .query({
      countryCode: 'CD',
    })
    .expect(200);

  assert.deepEqual(
    listResponse.body.items.map((item: { label: string }) => item.label),
    ['Likasi', 'Lubumbashi'],
  );

  const firstSuggestion = await request(harness.app.getHttpServer())
    .post('/locations/suggestions')
    .send({
      countryCode: 'CD',
      label: 'Kasumbalesa',
      type: 'city',
    })
    .expect(201);

  assert.equal(firstSuggestion.body.label, 'Kasumbalesa');
  assert.equal(firstSuggestion.body.sourceType, 'user_suggested');

  const secondSuggestion = await request(harness.app.getHttpServer())
    .post('/locations/suggestions')
    .send({
      countryCode: 'CD',
      label: '  kasumbálesa ',
      type: 'city',
    })
    .expect(201);

  assert.equal(secondSuggestion.body.label, 'Kasumbalesa');
  assert.equal(harness.prisma.locationOptions.size, 3);
});
