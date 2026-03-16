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

test('chat inbox returns a thread associated with a listing', async (t) => {
  const app = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .get('/chat/threads')
    .expect(200);

  assert.ok(Array.isArray(response.body.items));
  assert.ok(response.body.items.length >= 1);
  assert.equal(response.body.items[0].listingSlug, 'samsung-galaxy-a54-neuf-lubumbashi');
  assert.equal(response.body.items[0].participantName, 'Patrick Mobile');
});

test('chat send appends a message to a thread', async (t) => {
  const app = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const threadResponse = await request(app.getHttpServer())
    .get('/chat/threads/thread_samsung_galaxy_a54')
    .expect(200);

  assert.equal(threadResponse.body.messages.length, 2);

  const sendResponse = await request(app.getHttpServer())
    .post('/chat/threads/thread_samsung_galaxy_a54/messages')
    .send({
      body: 'Je peux passer ce soir ?',
    })
    .expect(201);

  assert.equal(sendResponse.body.messages.length, 3);
  assert.equal(sendResponse.body.messages.at(-1).body, 'Je peux passer ce soir ?');
  assert.equal(sendResponse.body.messages.at(-1).senderRole, 'buyer');
});
