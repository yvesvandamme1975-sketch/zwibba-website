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

test('wallet endpoint returns a balance and transaction history', async (t) => {
  const app = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .get('/wallet')
    .expect(200);

  assert.equal(response.body.balanceCdf, 120000);
  assert.ok(Array.isArray(response.body.transactions));
  assert.equal(response.body.transactions[0].label, 'Vente Samsung Galaxy A54');
  assert.equal(response.body.transactions[0].amountCdf, 450000);
});
