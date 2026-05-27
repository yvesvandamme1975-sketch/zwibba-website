import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import { StoryImageService } from '../../src/share/story-image.service';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTO_BUFFER = readFileSync(path.resolve(__dirname, '../fixtures/sample-product.png'));

function buildMocks() {
  const updates: any[] = [];
  const r2Puts: any[] = [];

  const prismaService = {
    listing: {
      findUnique: async () => ({
        id: 'l1',
        title: 'Bague or blanc motif losanges',
        primaryImageUrl: 'https://cdn.example.com/photo.jpg',
        zoneLabel: 'Gombe, Kinshasa',
        priceAmount: 80000,
        priceCurrency: 'CDF',
      }),
      update: async (args: any) => {
        updates.push(args);
        return args.data;
      },
    },
  };

  const r2StorageService = {
    putBuffer: async (args: any) => {
      r2Puts.push(args);
      return { objectKey: args.objectKey, publicUrl: `https://r2.example.com/${args.objectKey}` };
    },
  };

  // sharp composite is the real pipeline; we'll feed a tiny photo via fetch mock
  const fetchImpl = async () => ({ arrayBuffer: async () => PHOTO_BUFFER });

  return { prismaService, r2StorageService, updates, r2Puts, fetchImpl };
}

test('generateAndStoreForListing composes, uploads, and persists the URL', async () => {
  const mocks = buildMocks();
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });

  const result = await service.generateAndStoreForListing('l1');

  assert.match(result.storyImageUrl, /listings\/l1\/story\.png$/);
  assert.equal(mocks.r2Puts.length, 1);
  assert.equal(mocks.r2Puts[0].objectKey, 'listings/l1/story.png');
  assert.equal(mocks.r2Puts[0].contentType, 'image/png');
  assert.equal(mocks.updates.length, 1);
  assert.equal(mocks.updates[0].where.id, 'l1');
  assert.match(mocks.updates[0].data.storyImageUrl, /listings\/l1\/story\.png$/);
});

test('generateAndStoreForListing throws when the listing is not found', async () => {
  const mocks = buildMocks();
  mocks.prismaService.listing.findUnique = async () => null;
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });
  await assert.rejects(() => service.generateAndStoreForListing('unknown'), /not found/i);
});
