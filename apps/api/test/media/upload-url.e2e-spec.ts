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

class _FakePrismaService {
  readonly draftPhotos: Array<{
    draft: {
      ownerPhoneNumber: string;
    };
    objectKey: string;
  }> = [];
  readonly sessions = new Map<string, {
    token: string;
    user: {
      phoneNumber: string;
    };
  }>();

  seedDraftPhoto({
    objectKey,
    ownerPhoneNumber,
  }: {
    objectKey: string;
    ownerPhoneNumber: string;
  }) {
    this.draftPhotos.push({
      draft: {
        ownerPhoneNumber,
      },
      objectKey,
    });
  }

  seedSession({
    phoneNumber,
    token,
  }: {
    phoneNumber: string;
    token: string;
  }) {
    this.sessions.set(token, {
      token,
      user: {
        phoneNumber,
      },
    });
  }

  readonly draftPhoto = {
    findMany: async ({
      where,
    }: {
      where: {
        draft: {
          is: {
            ownerPhoneNumber: string;
          };
        };
        objectKey: {
          in: string[];
        };
      };
    }) => {
      return this.draftPhotos
        .filter((photo) => {
          return where.objectKey.in.includes(photo.objectKey) &&
            photo.draft.ownerPhoneNumber === where.draft.is.ownerPhoneNumber;
        })
        .map((photo) => ({
          objectKey: photo.objectKey,
        }));
    },
  };

  readonly session = {
    findUnique: async ({
      where,
    }: {
      where: {
        token: string;
      };
    }) => {
      return this.sessions.get(where.token) ?? null;
    },
  };
}

async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: _FakePrismaService;
  r2StorageService: _FakeR2StorageService;
}> {
  const prisma = new _FakePrismaService();
  const r2StorageService = new _FakeR2StorageService();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(R2StorageService)
    .useValue(r2StorageService)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return {
    app,
    prisma,
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

test('discard uploaded endpoint requires a seller session', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });

  await request(harness.app.getHttpServer())
    .post('/media/discard-uploaded')
    .send({
      objectKeys: ['draft-photos/capture/photo_1.jpg', 'draft-photos/face/photo_2.jpg'],
    })
    .expect(401);

  assert.deepEqual(harness.r2StorageService.deletedObjectKeys, []);
});

test('discard uploaded endpoint deletes only draft photos owned by the seller session', async (t) => {
  const harness = await createTestApp();
  t.after(async () => {
    await harness.app.close();
  });
  harness.prisma.seedSession({
    phoneNumber: '+243990000001',
    token: 'zwibba_session_owner',
  });
  harness.prisma.seedDraftPhoto({
    objectKey: 'draft-photos/capture/photo_owned.jpg',
    ownerPhoneNumber: '+243990000001',
  });
  harness.prisma.seedDraftPhoto({
    objectKey: 'draft-photos/capture/photo_other.jpg',
    ownerPhoneNumber: '+243990000002',
  });

  const response = await request(harness.app.getHttpServer())
    .post('/media/discard-uploaded')
    .set('authorization', 'Bearer zwibba_session_owner')
    .send({
      objectKeys: [
        'draft-photos/capture/photo_owned.jpg',
        'draft-photos/capture/photo_other.jpg',
        'avatars/not-a-draft-photo.jpg',
      ],
    })
    .expect(201);

  assert.deepEqual(response.body, {
    deletedCount: 1,
    status: 'deleted',
  });
  assert.deepEqual(harness.r2StorageService.deletedObjectKeys, [
    'draft-photos/capture/photo_owned.jpg',
  ]);
});
