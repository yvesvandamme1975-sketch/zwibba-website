import 'reflect-metadata';
import { ListingsService } from '../../src/listings/listings.service';
import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createListingThumbnail } from '../../src/listings/listing-thumbnail';

test('thumbnail preserves the full photo within 480px and emits WebP', async () => {
 const photo=await sharp({create:{width:1600,height:1200,channels:3,background:'#237739'}}).jpeg().toBuffer();
 const result=await createListingThumbnail('https://media.test/draft-photos/photo.jpg','https://media.test',async () => new Response(photo));
 const meta=await sharp(result).metadata();
 assert.equal(meta.format,'webp');assert.equal(meta.width,480);assert.equal(meta.height,360);
 assert.ok(result.length<photo.length);
});
test('thumbnail refuses untrusted origins, redirects and oversized bodies', async () => {
 await assert.rejects(()=>createListingThumbnail('https://evil.test/a','https://media.test',async()=>{throw Error('must not fetch')}),/source/);
 await assert.rejects(()=>createListingThumbnail('https://media.test/a','https://media.test',async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1'}})),/download/);
 await assert.rejects(()=>createListingThumbnail('https://media.test/a','https://media.test',async()=>new Response(new Uint8Array(8_000_001))),/large/);
});

test('thumbnail never serves an unpublished listing, including a previously cached image', async () => {
  let visible = true;
  const source = 'https://cdn.zwibba.example/draft-photos/a.jpg';
  const service = new ListingsService({
    listing: { findUnique: async () => visible ? { slug: 'a', draftId: 'draft', moderationStatus: 'approved', lifecycleStatus: 'active' } : { moderationStatus: 'rejected' } },
    draft: { findUnique: async () => ({ photos: [{ publicUrl: source, uploadStatus: 'uploaded' }] }) },
  } as any);
  const bytes = Buffer.from('cached');
  (service as any).thumbnails.set(source, { bytes, at: Date.now() });
  assert.equal(await service.getListingThumbnail('a'), bytes);
  visible = false;
  await assert.rejects(() => service.getListingThumbnail('a'), /Annonce indisponible/);
});

test('thumbnail requests beyond the two concurrent jobs wait their turn instead of failing', async () => {
  const service = new ListingsService({
    listing: { findUnique: async ({ where }: any) => ({ slug: where.slug, draftId: where.slug, moderationStatus: 'approved', lifecycleStatus: 'active' }) },
    draft: { findUnique: async ({ where }: any) => ({ photos: [{ publicUrl: `https://cdn.zwibba.example/draft-photos/${where.id}.jpg`, uploadStatus: 'uploaded' }] }) },
  } as any);
  let running = 0; let peak = 0;
  (service as any).renderThumbnail = async (source: string) => {
    running += 1; peak = Math.max(peak, running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    running -= 1;
    return Buffer.from(source);
  };
  const results = await Promise.all(['a', 'b', 'c', 'd', 'e'].map((slug) => service.getListingThumbnail(slug)));
  assert.deepEqual(results.map(String), ['a', 'b', 'c', 'd', 'e'].map((id) => `https://cdn.zwibba.example/draft-photos/${id}.jpg`));
  assert.equal(peak, 2);
});
