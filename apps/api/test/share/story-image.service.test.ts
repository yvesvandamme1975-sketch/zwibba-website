import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

process.env.R2_PUBLIC_BASE_URL = 'https://cdn.example.com';

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
        moderationStatus: 'approved',
        lifecycleStatus: 'active',
        deletedBySellerAt: null,
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
    return new Response(PHOTO_BUFFER);
  };

  return { prismaService, r2StorageService, updates, r2Puts, fetchedUrls, fetchImpl };
}

test('story generation reads current data on each request without uploads or database writes', async () => {
  const mocks = buildMocks();
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });
  const first = await service.generateStoryForSlug('bague');
  const original = await mocks.prismaService.listing.findUnique();
  mocks.prismaService.listing.findUnique = async () => ({ ...original, title: 'Nouveau titre', priceAmount: 42 });
  const second = await service.generateStoryForSlug('bague');
  const metadata = await sharp(second).metadata();
  assert.equal(metadata.width, 1080); assert.equal(metadata.height, 1920); assert.equal(metadata.format, 'png');
  assert.notDeepEqual(first, second);
  assert.equal(mocks.fetchedUrls.length, 2);
  assert.deepEqual(mocks.r2Puts, []); assert.deepEqual(mocks.updates, []);
  assert.equal(hasCurrentLinkImage('https://r2/listings/l1/share-v3-portrait-0123456789abcdef.jpg'), true);
  assert.equal(hasCurrentLinkImage('https://r2/listings/l1/share.png'), false);
  assert.equal(hasCurrentLinkImage(null), false);
  assert.equal(hasCurrentLinkImage('https://r2/listings/l1/share-v2-0123456789abcdef.jpg'), false);
});

test('generateLinkImageForListing regenerates only the link preview, never story.png, with a full compare-and-set', async () => {
  const mocks = buildMocks();
  const updatedAt = new Date('2026-09-01T10:00:00Z');
  const updateMany: any[] = [];
  const previous = 'https://r2.example.com/listings/l1/share.png';
  const listing = { id: 'l1', draftId: 'd1', title: 'Bague', area: 'Gombe', priceAmount: 80000, priceCurrency: 'CDF', updatedAt, moderationStatus: 'approved', lifecycleStatus: 'active', deletedBySellerAt: null, storyImageUrl: 'https://r2.example.com/listings/l1/story.png', shareImageUrl: previous };
  mocks.prismaService.listing.findUnique = async () => listing;
  (mocks.prismaService.listing as any).updateMany = async (args: any) => { updateMany.push(args); return { count: 1 }; };
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });

  const result = await service.generateLinkImageForListing('l1');

  assert.equal(mocks.r2Puts.length, 1, 'story.png is not re-rendered nor re-uploaded');
  assert.match(mocks.r2Puts[0].objectKey, /^listings\/l1\/share-v3-portrait-[a-f0-9]{16}\.jpg$/);
  assert.equal(mocks.r2Puts[0].objectKey, `listings/l1/${linkImageFilename(mocks.r2Puts[0].body)}`, 'object key is derived from the bytes');
  assert.equal(mocks.r2Puts[0].contentType, 'image/jpeg');
  assert.equal(mocks.updates.length, 0, 'no unconditional update');
  assert.equal(updateMany.length, 1);
  assert.deepEqual(updateMany[0].where, { id: 'l1', updatedAt, shareImageUrl: previous, moderationStatus: 'approved', lifecycleStatus: 'active', deletedBySellerAt: null });
  assert.deepEqual(Object.keys(updateMany[0].data).sort(), ['shareImageUrl', 'updatedAt']);
  assert.equal(updateMany[0].data.updatedAt.getTime(), updatedAt.getTime(), 'updatedAt preserved so the feed order does not change');
  assert.equal(result.previousShareImageUrl, previous);
  assert.match(result.shareImageUrl, /listings\/l1\/share-v3-portrait-[a-f0-9]{16}\.jpg$/);
  assert.equal(result.storyImageUrl, 'https://r2.example.com/listings/l1/story.png');
  assert.equal(result.bytes, mocks.r2Puts[0].body.length);
});

test('generateLinkImageForListing refuses listings that are not publicly visible, before any upload', async () => {
  const base = { id: 'l1', draftId: 'd1', title: 'Bague', area: 'Gombe', priceAmount: 1, priceCurrency: 'EUR', updatedAt: new Date(), shareImageUrl: null, deletedBySellerAt: null };
  const cases = [
    { moderationStatus: 'pending', lifecycleStatus: 'active' },
    { moderationStatus: 'approved', lifecycleStatus: 'sold' },
    { moderationStatus: 'approved', lifecycleStatus: 'paused' },
    { moderationStatus: 'approved', lifecycleStatus: 'deleted_by_seller' },
    { moderationStatus: 'approved', lifecycleStatus: 'active', deletedBySellerAt: new Date() },
  ];
  for (const variant of cases) {
    const mocks = buildMocks();
    mocks.prismaService.listing.findUnique = async () => ({ ...base, ...variant });
    (mocks.prismaService.listing as any).updateMany = async () => { throw new Error('must not be reached'); };
    const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });
    await assert.rejects(() => service.generateLinkImageForListing('l1'), /listing_not_public/, JSON.stringify(variant));
    assert.equal(mocks.r2Puts.length, 0, `no upload for ${JSON.stringify(variant)}`);
    assert.equal(mocks.updates.length, 0);
  }
});

test('a concurrent change leaves the referenced object and the database URL untouched', async () => {
  const mocks = buildMocks();
  const updatedAt = new Date('2026-09-01T10:00:00Z');
  const referenced = 'https://r2.example.com/listings/l1/share-v3-portrait-0123456789abcdef.jpg';
  // Simulates a newer generation that already landed between our read and write.
  const db = { shareImageUrl: referenced, updatedAt };
  mocks.prismaService.listing.findUnique = async () => ({ id: 'l1', draftId: 'd1', title: 'Bague', area: 'Gombe', priceAmount: 80000, priceCurrency: 'CDF', updatedAt, moderationStatus: 'approved', lifecycleStatus: 'active', deletedBySellerAt: null, shareImageUrl: 'https://r2.example.com/listings/l1/share.png' });
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

test('generateStoryForSlug throws when no uploaded draft photo is available', async () => {
  const mocks = buildMocks();
  mocks.prismaService.draft.findUnique = async () => ({ id: 'd1', photos: [] });
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });

  await assert.rejects(() => service.generateStoryForSlug('l1'), /image/i);
  assert.equal(mocks.r2Puts.length, 0);
  assert.equal(mocks.updates.length, 0);
});

test('generateStoryForSlug throws when the listing is not found', async () => {
  const mocks = buildMocks();
  mocks.prismaService.listing.findUnique = async () => null;
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl as any });
  await assert.rejects(() => service.generateStoryForSlug('unknown'), /not found/i);
});


test('failed photo fetch never composes or uploads an error document', async () => {
  const mocks = buildMocks();
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: (async () => (new Response('unavailable', { status: 503 }))) as any });
  await assert.rejects(() => service.generateStoryForSlug('l1'), /503/);
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

  await service.generateStoryForSlug('l1');

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
    }).generateStoryForSlug('l1');
    assert.equal(
      withEnv.fetchedUrls[0],
      'https://staging.zwibba.example/assets/listings/mangues-et-avocats-frais-du-haut-katanga.jpg',
    );

    delete process.env.APP_BASE_URL;
    const withoutEnv = buildMocks();
    withoutEnv.prismaService.draft.findUnique = async () => ({ id: 'd1', photos: [relativePhoto] });
    await new StoryImageService(withoutEnv.prismaService as any, withoutEnv.r2StorageService as any, {
      fetchImpl: withoutEnv.fetchImpl as any,
    }).generateStoryForSlug('l1');
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

  await service.generateStoryForSlug('l1');

  assert.equal(mocks.fetchedUrls[0], 'https://cdn.example.com/photo.jpg');
});

test('share prices preserve zero and format currencies for both markets', () => {
  assert.equal(formatSharePrice(0, 'EUR'), '0 €');
  assert.equal(formatSharePrice(250, 'EUR'), '250 €');
  assert.equal(formatSharePrice(50, 'USD'), '50 US$');
  assert.equal(formatSharePrice(500, 'CDF'), '500 CDF');
  assert.equal(formatSharePrice(null, 'CDF'), '');
});


test('stories reject hidden listings before downloading a photo', async () => {
  for (const variant of [{moderationStatus:'pending'}, {lifecycleStatus:'sold'}, {lifecycleStatus:'paused'}, {deletedBySellerAt:new Date()}]) {
    const mocks=buildMocks(); const original=await mocks.prismaService.listing.findUnique();
    mocks.prismaService.listing.findUnique=async()=>({...original,...variant});
    const service=new StoryImageService(mocks.prismaService as any,mocks.r2StorageService as any,{fetchImpl:mocks.fetchImpl as any});
    await assert.rejects(()=>service.generateStoryForSlug('bague'),/listing_not_public/);
    assert.deepEqual(mocks.fetchedUrls,[]); assert.deepEqual(mocks.r2Puts,[]);
  }
});

test('story rendering limits parallel work and frees a failed slot', async () => {
  const mocks=buildMocks();const pending: Array<() => void>=[];
  const service=new StoryImageService(mocks.prismaService as any,mocks.r2StorageService as any,{fetchImpl:(()=>new Promise(resolve=>pending.push(()=>resolve(new Response('fail',{status:503})))) ) as any});
  const first=service.generateStoryForSlug('a'); const second=service.generateStoryForSlug('b');
  const failures=Promise.all([assert.rejects(()=>first,/503/),assert.rejects(()=>second,/503/)]);
  await assert.rejects(()=>service.generateStoryForSlug('c'),/occupée/);
  await new Promise(resolve=>setImmediate(resolve));pending.splice(0).forEach(done=>done());await failures;
  const next=service.generateStoryForSlug('d');const failure=assert.rejects(()=>next,/503/);
  await new Promise(resolve=>setImmediate(resolve));pending.splice(0).forEach(done=>done());await failure;
});

test('story photo loading rejects foreign URLs, redirects and oversized data', async () => {
  const mocks=buildMocks();
  mocks.prismaService.draft.findUnique=async()=>({id:'d1',photos:[{publicUrl:'http://127.0.0.1/private',uploadStatus:'uploaded',sourcePresetId:'capture',createdAt:new Date()}]});
  const service=new StoryImageService(mocks.prismaService as any,mocks.r2StorageService as any,{fetchImpl:mocks.fetchImpl as any});
  await assert.rejects(()=>service.generateStoryForSlug('a'),/source_not_allowed/);assert.deepEqual(mocks.fetchedUrls,[]);
  for(const response of [new Response(null,{status:302}),new Response(new Uint8Array(8_000_001))]){
    const valid=buildMocks();const guarded=new StoryImageService(valid.prismaService as any,valid.r2StorageService as any,{fetchImpl:(async (_url:any, options:any)=>{assert.equal(options.redirect,'error');return response;}) as any});
    await assert.rejects(()=>guarded.generateStoryForSlug('a'),/302|too large/);
  }
});
