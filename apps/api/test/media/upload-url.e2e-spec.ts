import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { R2StorageService } from '../../src/media/r2-storage.service';

class _FakeR2StorageService {
  deletedObjectKeys: string[] = [];

  async createPresignedUpload({
    contentType,
    objectKey,
  }: {
    contentType: string;
    objectKey: string;
  }) {
    return {
      objectKey,
      publicUrl: `https://cdn.zwibba.example/${objectKey}`,
      uploadUrl: `https://uploads.zwibba.example/${encodeURIComponent(contentType)}`,
    };
  }

  async deleteObject(objectKey: string) {
    this.deletedObjectKeys.push(objectKey);
  }
}

async function createTestApp(): Promise<{
  app: INestApplication;
  r2StorageService: _FakeR2StorageService;
}> {
  const r2StorageService = new _FakeR2StorageService();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(R2StorageService)
    .useValue(r2StorageService)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return {
    app,
    r2StorageService,
  };
}

test('upload url endpoint returns an object key and presigned put url', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const response = await request(harness.app.getHttpServer())
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

test('discard uploaded endpoint deletes all requested draft photo object keys', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  const response = await request(harness.app.getHttpServer())
    .post('/media/discard-uploaded')
    .send({
      objectKeys: ['draft-photos/capture/photo_1.jpg', 'draft-photos/face/photo_2.jpg'],
    })
    .expect(201);

  assert.deepEqual(response.body, {
    deletedCount: 2,
    status: 'deleted',
  });
  assert.deepEqual(harness.r2StorageService.deletedObjectKeys, [
    'draft-photos/capture/photo_1.jpg',
    'draft-photos/face/photo_2.jpg',
  ]);
});
