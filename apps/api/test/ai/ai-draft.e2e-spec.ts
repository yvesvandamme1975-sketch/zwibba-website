import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

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
      photoPresetId: 'phone-front',
    })
    .expect(201);

  assert.equal(response.body.status, 'ready');
  assert.equal(response.body.draftPatch.title, 'Samsung Galaxy A54 128 Go');
  assert.equal(response.body.draftPatch.categoryId, 'phones_tablets');
  assert.equal(response.body.draftPatch.condition, 'like_new');
  assert.match(response.body.draftPatch.description, /propre/i);
  assert.equal(response.body.draftPatch.suggestedPriceMinCdf, 3900000);
  assert.equal(response.body.draftPatch.suggestedPriceMaxCdf, 4500000);
});
