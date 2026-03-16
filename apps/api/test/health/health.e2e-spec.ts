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
    .useValue({
      $queryRaw: async () => [{ status: 1 }],
    })
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

test('health endpoint reports app and database status', async (t) => {
  const app = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .get('/healthz')
    .expect(200);

  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.database, 'up');
});
