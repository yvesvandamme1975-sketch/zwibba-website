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

test('upload url endpoint returns an object key and presigned put url', async (t) => {
  const app = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .post('/media/upload-url')
    .send({
      contentType: 'image/jpeg',
      fileName: 'phone-front.jpg',
      sourcePresetId: 'phone-front',
    })
    .expect(201);

  assert.match(response.body.objectKey, /^draft-photos\//);
  assert.match(response.body.photoId, /^photo_/);
  assert.match(response.body.publicUrl, /^https:\/\/cdn\.zwibba\.example\//);
  assert.match(response.body.uploadUrl, /^https?:\/\//);
});
