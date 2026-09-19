import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import { StoryImageService, formatSharePrice, hasCurrentLinkImage, linkImageFilename } from '../../src/share/story-image.service';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTO_BUFFER = readFileSync(path.resolve(__dirname, '../fixtures/sample-product.png'));

function buildMocks() {
  const updates: any[] = [];
  const r2Puts: any[] = [];
  const fetchedUrls: string[] = [];

  const prismaService = {
    listing: {
      findUnique: async () => ({
        id: 'l1',
        draftId: 'd1',
        title: 'Bague or blanc motif losanges',
        area: 'Gombe, Kinshasa',
        priceAmount: 80000,
        priceCurrency: 'CDF',
      }),
      update: async (args: any) => {
        updates.push(args);
        return args.data;
      },
    },
    draft: {
      findUnique: async () => ({
        id: 'd1',
        photos: [
          {
            publicUrl: 'https://cdn.example.com/photo.jpg',
            uploadStatus: 'uploaded',
            sourcePresetId: 'capture',
            createdAt: new Date(),
          },
        ],
      }),
    },
  };

  const r2StorageService = {
    putBuffer: async (args: any) => {
      r2Puts.push(args);
      return { objectKey: args.objectKey, publicUrl: `https://r2.example.com/${args.objectKey}` };
    },
  };

  // sharp composite is the real pipeline; we'll feed a tiny photo via fetch mock
  const fetchImpl = async (url: string) => {
    fetchedUrls.push(url);
    return { ok: true, arrayBuffer: async () => PHOTO_BUFFER };
  };

  return { prismaService, r2StorageService, updates, r2Puts, fetchedUrls, fetchImpl };
}

test('generateAndStoreForListing composes, uploads, and persists the URL', async () => {
  const mocks = buildMocks();
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });

  const result = await service.generateAndStoreForListing('l1');

  assert.match(result.storyImageUrl, /listings\/l1\/story\.png$/);
  assert.equal(mocks.r2Puts.length, 2);
  // Versioned, content-addressed key: Facebook and WhatsApp cache previews per
  // URL, so a new design must live at a new address; the hash makes the object
  // immutable. JPEG keeps the preview under 300 KB.
  assert.match(mocks.r2Puts[1].objectKey, /^listings\/l1\/share-v2-[a-f0-9]{16}\.jpg$/);
  assert.equal(mocks.r2Puts[1].objectKey, `listings/l1/${linkImageFilename(mocks.r2Puts[1].body)}`);
  assert.equal(mocks.r2Puts[1].contentType, 'image/jpeg');
  assert.match(mocks.updates[0].data.shareImageUrl, /listings\/l1\/share-v2-[a-f0-9]{16}\.jpg$/);
  assert.equal(hasCurrentLinkImage(mocks.updates[0].data.shareImageUrl), true);
  assert.equal(hasCurrentLinkImage('https://r2/listings/l1/share.png'), false);
  assert.equal(hasCurrentLinkImage(null), false);
  assert.equal(mocks.r2Puts[0].objectKey, 'listings/l1/story.png');
  assert.equal(mocks.r2Puts[0].contentType, 'image/png');
  assert.equal(mocks.updates.length, 1);
  assert.equal(mocks.updates[0].where.id, 'l1');
  assert.match(mocks.updates[0].data.storyImageUrl, /listings\/l1\/story\.png$/);
  assert.equal(mocks.fetchedUrls[0], 'https://cdn.example.com/photo.jpg');
});

test('generateLinkImageForListing regenerates only the link preview, never story.png, with a full compare-and-set', async () => {
  const mocks = buildMocks();
  const updatedAt = new Date('2026-09-01T10:00:00Z');
  const updateMany: any[] = [];
  const previous = 'https://r2.example.com/listings/l1/share.png';
  const listing = { id: 'l1', draftId: 'd1', title: 'Bague', area: 'Gombe', priceAmount: 80000, priceCurrency: 'CDF', updatedAt, moderationStatus: 'approved', storyImageUrl: 'https://r2.example.com/listings/l1/story.png', shareImageUrl: previous };
  mocks.prismaService.listing.findUnique = async () => listing;
  (mocks.prismaService.listing as any).updateMany = async (args: any) => { updateMany.push(args); return { count: 1 }; };
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });

  const result = await service.generateLinkImageForListing('l1');

  assert.equal(mocks.r2Puts.length, 1, 'story.png is not re-rendered nor re-uploaded');
  assert.match(mocks.r2Puts[0].objectKey, /^listings\/l1\/share-v2-[a-f0-9]{16}\.jpg$/);
  assert.equal(mocks.r2Puts[0].objectKey, `listings/l1/${linkImageFilename(mocks.r2Puts[0].body)}`, 'object key is derived from the bytes');
  assert.equal(mocks.r2Puts[0].contentType, 'image/jpeg');
  assert.equal(mocks.updates.length, 0, 'no unconditional update');
  assert.equal(updateMany.length, 1);
  assert.deepEqual(updateMany[0].where, { id: 'l1', updatedAt, shareImageUrl: previous, moderationStatus: 'approved' });
  assert.deepEqual(Object.keys(updateMany[0].data).sort(), ['shareImageUrl', 'updatedAt']);
  assert.equal(updateMany[0].data.updatedAt.getTime(), updatedAt.getTime(), 'updatedAt preserved so the feed order does not change');
  assert.equal(result.previousShareImageUrl, previous);
  assert.match(result.shareImageUrl, /listings\/l1\/share-v2-[a-f0-9]{16}\.jpg$/);
  assert.equal(result.storyImageUrl, 'https://r2.example.com/listings/l1/story.png');
  assert.equal(result.bytes, mocks.r2Puts[0].body.length);
});

test('generateLinkImageForListing refuses non-approved listings before any upload', async () => {
  const mocks = buildMocks();
  mocks.prismaService.listing.findUnique = async () => ({ id: 'l1', draftId: 'd1', title: 'Bague', area: 'Gombe', priceAmount: 1, priceCurrency: 'EUR', updatedAt: new Date(), moderationStatus: 'pending', shareImageUrl: null });
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });
  await assert.rejects(() => service.generateLinkImageForListing('l1'), /listing_not_approved/);
  assert.equal(mocks.r2Puts.length, 0);
});

test('a concurrent change leaves the referenced object and the database URL untouched', async () => {
  const mocks = buildMocks();
  const updatedAt = new Date('2026-09-01T10:00:00Z');
  const referenced = 'https://r2.example.com/listings/l1/share-v2-0123456789abcdef.jpg';
  // Simulates a newer generation that already landed between our read and write.
  const db = { shareImageUrl: referenced, updatedAt };
  mocks.prismaService.listing.findUnique = async () => ({ id: 'l1', draftId: 'd1', title: 'Bague', area: 'Gombe', priceAmount: 80000, priceCurrency: 'CDF', updatedAt, moderationStatus: 'approved', shareImageUrl: 'https://r2.example.com/listings/l1/share.png' });
  (mocks.prismaService.listing as any).updateMany = async (args: any) => {
    const matches = args.where.shareImageUrl === db.shareImageUrl && args.where.updatedAt.getTime() === db.updatedAt.getTime();
    if (matches) db.shareImageUrl = args.data.shareImageUrl;
    return { count: matches ? 1 : 0 };
  };
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });

  await assert.rejects(() => service.generateLinkImageForListing('l1'), /listing_changed_concurrently/);
  assert.equal(db.shareImageUrl, referenced, 'database URL not altered');
  assert.equal(mocks.r2Puts.length, 1);
  assert.notEqual(`https://r2.example.com/${mocks.r2Puts[0].objectKey}`, referenced, 'the referenced object key is never written to');
  assert.equal(mocks.updates.length, 0);
});

test('generateAndStoreForListing throws when no uploaded draft photo is available', async () => {
  const mocks = buildMocks();
  mocks.prismaService.draft.findUnique = async () => ({ id: 'd1', photos: [] });
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });

  await assert.rejects(() => service.generateAndStoreForListing('l1'), /image/i);
  assert.equal(mocks.r2Puts.length, 0);
  assert.equal(mocks.updates.length, 0);
});

test('generateAndStoreForListing throws when the listing is not found', async () => {
  const mocks = buildMocks();
  mocks.prismaService.listing.findUnique = async () => null;
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });
  await assert.rejects(() => service.generateAndStoreForListing('unknown'), /not found/i);
});


test('failed photo fetch never composes or uploads an error document', async () => {
  const mocks = buildMocks();
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: (async () => ({ ok: false, status: 503, arrayBuffer: async () => PHOTO_BUFFER })) as any });
  await assert.rejects(() => service.generateAndStoreForListing('l1'), /503/);
  assert.equal(mocks.r2Puts.length, 0);
  assert.equal(mocks.updates.length, 0);
});

test('relative draft photo urls resolve against the configured application origin', async () => {
  const mocks = buildMocks();
  mocks.prismaService.draft.findUnique = async () => ({
    id: 'd1',
    photos: [
      {
        publicUrl: '/assets/listings/be-velo-cargo-electrique-bruxelles.jpg',
        uploadStatus: 'uploaded',
        sourcePresetId: 'capture',
        createdAt: new Date(),
      },
    ],
  });
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, {
    fetchImpl: mocks.fetchImpl as any,
    appBaseUrl: 'https://zwibba.com/App/',
  });

  await service.generateAndStoreForListing('l1');

  assert.equal(
    mocks.fetchedUrls[0],
    'https://zwibba.com/assets/listings/be-velo-cargo-electrique-bruxelles.jpg',
  );
});

test('relative draft photo urls fall back to APP_BASE_URL then to the public site', async () => {
  const previous = process.env.APP_BASE_URL;
  const relativePhoto = {
    publicUrl: '/assets/listings/mangues-et-avocats-frais-du-haut-katanga.jpg',
    uploadStatus: 'uploaded',
    sourcePresetId: 'capture',
    createdAt: new Date(),
  };

  try {
    process.env.APP_BASE_URL = 'https://staging.zwibba.example';
    const withEnv = buildMocks();
    withEnv.prismaService.draft.findUnique = async () => ({ id: 'd1', photos: [relativePhoto] });
    await new StoryImageService(withEnv.prismaService as any, withEnv.r2StorageService as any, {
      fetchImpl: withEnv.fetchImpl as any,
    }).generateAndStoreForListing('l1');
    assert.equal(
      withEnv.fetchedUrls[0],
      'https://staging.zwibba.example/assets/listings/mangues-et-avocats-frais-du-haut-katanga.jpg',
    );

    delete process.env.APP_BASE_URL;
    const withoutEnv = buildMocks();
    withoutEnv.prismaService.draft.findUnique = async () => ({ id: 'd1', photos: [relativePhoto] });
    await new StoryImageService(withoutEnv.prismaService as any, withoutEnv.r2StorageService as any, {
      fetchImpl: withoutEnv.fetchImpl as any,
    }).generateAndStoreForListing('l1');
    assert.equal(
      withoutEnv.fetchedUrls[0],
      'https://zwibba.com/assets/listings/mangues-et-avocats-frais-du-haut-katanga.jpg',
    );
  } finally {
    if (previous === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previous;
  }
});

test('absolute photo urls are fetched unchanged whatever the application origin', async () => {
  const mocks = buildMocks();
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, {
    fetchImpl: mocks.fetchImpl as any,
    appBaseUrl: 'https://zwibba.com/App/',
  });

  await service.generateAndStoreForListing('l1');

  assert.equal(mocks.fetchedUrls[0], 'https://cdn.example.com/photo.jpg');
});

test('share prices preserve zero and format currencies for both markets', () => {
  assert.equal(formatSharePrice(0, 'EUR'), '0 €');
  assert.equal(formatSharePrice(250, 'EUR'), '250 €');
  assert.equal(formatSharePrice(50, 'USD'), '50 US$');
  assert.equal(formatSharePrice(500, 'CDF'), '500 CDF');
  assert.equal(formatSharePrice(null, 'CDF'), '');
});
