import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { VISION_DRAFT_PROVIDER } from '../../src/ai/vision-draft-provider';
import { PrismaService } from '../../src/database/prisma.service';

async function createTestApp(
  providerOverride?: { generateDraftFromImage: (input: unknown) => Promise<Record<string, unknown>> },
): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue({});

  if (providerOverride) {
    builder = builder.overrideProvider(VISION_DRAFT_PROVIDER).useValue(providerOverride);
  }

  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

test('ai draft endpoint returns the structured seller draft response', async (t) => {
  const app = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .post('/ai/draft')
    .send({
      contentType: 'image/jpeg',
      objectKey: 'draft-photos/capture/photo_1-phone.jpg',
      photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
    })
    .expect(201);

  assert.equal(response.body.status, 'ready');
  assert.equal(typeof response.body.draftPatch.title, 'string');
  assert.equal(typeof response.body.draftPatch.categoryId, 'string');
  assert.equal(typeof response.body.draftPatch.condition, 'string');
  assert.equal(typeof response.body.draftPatch.description, 'string');
  assert.equal('suggestedPriceMinCdf' in response.body.draftPatch, false);
  assert.equal('suggestedPriceMaxCdf' in response.body.draftPatch, false);
});

test('ai draft endpoint requires an uploaded photo URL', async (t) => {
  const app = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  await request(app.getHttpServer())
    .post('/ai/draft')
    .send({
      photoPresetId: 'phone-front',
    })
    .expect(400);
});

test('ai draft endpoint falls back to manual mode when the provider omits the title', async (t) => {
  const app = await createTestApp({
    async generateDraftFromImage() {
      return {
        categoryId: 'home_garden',
        condition: 'used_good',
        description: 'Gâteau visible sur la photo.',
        title: '',
      };
    },
  });
  t.after(async () => {
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .post('/ai/draft')
    .send({
      contentType: 'image/jpeg',
      objectKey: 'draft-photos/capture/photo_1-cake.jpg',
      photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-cake.jpg',
    })
    .expect(201);

  assert.equal(response.body.status, 'manual_fallback');
  assert.match(response.body.message, /manuellement/i);
});
