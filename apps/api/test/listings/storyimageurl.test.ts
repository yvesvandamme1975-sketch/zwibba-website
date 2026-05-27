import assert from 'node:assert/strict';
import test from 'node:test';

import { ListingsService } from '../../src/listings/listings.service';

function buildListing() {
  return {
    area: 'Gombe',
    attributesJson: null,
    categoryId: 'fashion',
    deletedBySellerAt: null,
    deletedReason: null,
    description: 'Bague en bon état',
    draftId: 'd1',
    id: 'l1',
    lifecycleStatus: 'active',
    moderationStatus: 'approved',
    ownerPhoneNumber: '+243990000001',
    pausedAt: null,
    previousLifecycleStatusBeforeDelete: null,
    priceAmount: 80000,
    priceCdf: 80000,
    priceCurrency: 'CDF',
    slug: 'bague-or-blanc',
    soldAt: null,
    soldChannel: null,
    sourceType: 'user',
    storyImageUrl: 'https://r2/listings/l1/story.png',
    title: 'Bague or blanc',
    updatedAt: new Date('2026-05-27T10:00:00.000Z'),
  };
}

function buildPrismaMock() {
  const listing = buildListing();
  return {
    draft: {
      findUnique: async () => ({
        id: 'd1',
        photos: [{
          createdAt: new Date('2026-05-27T10:00:00.000Z'),
          publicUrl: 'https://cdn/photo.jpg',
          sourcePresetId: 'capture',
          uploadStatus: 'uploaded',
        }],
      }),
    },
    listing: {
      findMany: async () => [listing],
      findUnique: async () => listing,
    },
  };
}

test('browse feed listing payload includes storyImageUrl when present', async () => {
  const service = new ListingsService(buildPrismaMock() as any);
  const result = await service.listBrowseFeed();

  assert.equal(result.items[0].storyImageUrl, 'https://r2/listings/l1/story.png');
});

test('listing detail payload includes storyImageUrl when present', async () => {
  const service = new ListingsService(buildPrismaMock() as any);
  const result = await service.getListingDetail('bague-or-blanc');

  assert.equal(result.storyImageUrl, 'https://r2/listings/l1/story.png');
});
