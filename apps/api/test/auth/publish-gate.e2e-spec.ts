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

test('otp verify returns a seller session token', async (t) => {
  const app = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  await request(app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  const response = await request(app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      phoneNumber: '+243990000001',
      code: '123456',
    })
    .expect(201);

  assert.equal(response.body.phoneNumber, '+243990000001');
  assert.equal(response.body.canSyncDrafts, true);
  assert.match(response.body.sessionToken, /^zwibba_session_/);
});

test('draft sync accepts an authenticated seller draft', async (t) => {
  const app = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  await request(app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber: '+243990000001' })
    .expect(201);

  const verifyResponse = await request(app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      phoneNumber: '+243990000001',
      code: '123456',
    })
    .expect(201);

  const syncResponse = await request(app.getHttpServer())
    .post('/drafts/sync')
    .set('authorization', `Bearer ${verifyResponse.body.sessionToken}`)
    .send({
      title: 'Samsung Galaxy A54 128 Go',
      categoryId: 'phones_tablets',
      area: 'Lubumbashi Centre',
      priceCdf: 4256000,
    })
    .expect(201);

  assert.equal(syncResponse.body.syncStatus, 'synced');
  assert.equal(syncResponse.body.title, 'Samsung Galaxy A54 128 Go');
  assert.match(syncResponse.body.draftId, /^draft_/);
});
