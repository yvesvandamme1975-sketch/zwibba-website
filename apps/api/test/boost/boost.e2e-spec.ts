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

test('boost endpoint accepts a listing and returns a deterministic promoted state', async (t) => {
  const app = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .post('/boost')
    .send({
      listingId: 'draft_approved',
    })
    .expect(201);

  assert.equal(response.body.listingId, 'draft_approved');
  assert.equal(response.body.promoted, true);
  assert.equal(response.body.amountCdf, 15000);
  assert.equal(response.body.statusLabel, 'Boost activé pour 24 h');
});
