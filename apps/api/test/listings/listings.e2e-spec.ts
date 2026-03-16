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

test('listings feed returns browse cards with category, price, location, and slug', async (t) => {
  const app = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .get('/listings')
    .expect(200);

  assert.ok(Array.isArray(response.body.items));
  assert.ok(response.body.items.length >= 3);
  assert.equal(
    response.body.items[0].slug,
    'samsung-galaxy-a54-neuf-lubumbashi',
  );
  assert.equal(response.body.items[0].categoryLabel, 'Téléphones & Tablettes');
  assert.equal(response.body.items[0].priceCdf, 450000);
  assert.equal(response.body.items[0].locationLabel, 'Lubumbashi, Bel Air');
});

test('listing detail returns seller profile, safety tips, and contact actions', async (t) => {
  const app = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .get('/listings/samsung-galaxy-a54-neuf-lubumbashi')
    .expect(200);

  assert.equal(response.body.title, 'Samsung Galaxy A54 neuf sous emballage');
  assert.equal(response.body.seller.name, 'Patrick Mobile');
  assert.equal(response.body.seller.responseTime, 'Répond en moyenne en 9 min');
  assert.deepEqual(response.body.contactActions, [
    'whatsapp',
    'sms',
    'call',
  ]);
  assert.ok(Array.isArray(response.body.safetyTips));
  assert.match(response.body.safetyTips[0], /lieu public/i);
});
