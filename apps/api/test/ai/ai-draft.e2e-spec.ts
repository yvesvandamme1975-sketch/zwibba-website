import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue({})
    .compile();

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
