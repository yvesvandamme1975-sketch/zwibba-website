import assert from 'node:assert/strict';
import test from 'node:test';

import {
  selectLinkImageCandidates,
  runLinkImageBackfill,
  rollbackLinkImageBackfill,
  type BackfillManifest,
} from '../../scripts/backfill-share-images-runner';

const at = new Date('2026-09-01T10:00:00Z');
const listings = [
  { id: 'a', slug: 'a', moderationStatus: 'approved', lifecycleStatus: 'active', deletedBySellerAt: null, shareImageUrl: null, storyImageUrl: 'https://r2/listings/a/story.png', updatedAt: at },
  { id: 'b', slug: 'b', moderationStatus: 'approved', lifecycleStatus: null, deletedBySellerAt: null, shareImageUrl: 'https://r2/listings/b/share.png', storyImageUrl: null, updatedAt: at },
  { id: 'c', slug: 'c', moderationStatus: 'approved', lifecycleStatus: 'active', deletedBySellerAt: null, shareImageUrl: 'https://r2/listings/c/share-v2-0123456789abcdef.jpg', storyImageUrl: null, updatedAt: at },
  { id: 'd', slug: 'd', moderationStatus: 'pending', lifecycleStatus: 'active', deletedBySellerAt: null, shareImageUrl: null, storyImageUrl: null, updatedAt: at },
  { id: 'e', slug: 'e', moderationStatus: 'approved', lifecycleStatus: 'active', deletedBySellerAt: null, shareImageUrl: null, storyImageUrl: null, updatedAt: at },
  { id: 'sold', slug: 'sold', moderationStatus: 'approved', lifecycleStatus: 'sold', deletedBySellerAt: null, shareImageUrl: null, storyImageUrl: null, updatedAt: at },
  { id: 'paused', slug: 'paused', moderationStatus: 'approved', lifecycleStatus: 'paused', deletedBySellerAt: null, shareImageUrl: null, storyImageUrl: null, updatedAt: at },
  { id: 'deleted', slug: 'deleted', moderationStatus: 'approved', lifecycleStatus: 'deleted_by_seller', deletedBySellerAt: at, shareImageUrl: null, storyImageUrl: null, updatedAt: at },
  { id: 'marked', slug: 'marked', moderationStatus: 'approved', lifecycleStatus: 'active', deletedBySellerAt: at, shareImageUrl: null, storyImageUrl: null, updatedAt: at },
];

test('selection keeps only publicly visible listings (approved + active, not deleted) without the current preview, bounded by the limit', () => {
  const plan = selectLinkImageCandidates(listings, { limit: 2 });
  assert.equal(plan.scanned, 9);
  assert.deepEqual(plan.eligible.map((l) => l.id), ['a', 'b', 'e']);
  assert.deepEqual(plan.planned.map((l) => l.id), ['a', 'b']);
  assert.equal(plan.remaining, 1);
  assert.deepEqual(plan.skipped, { notPublic: ['d', 'sold', 'paused', 'deleted', 'marked'], current: ['c'] });
});

function fakes(overrides: { generate?: (id: string) => Promise<any> } = {}) {
  const calls: string[] = [];
  const prisma = {
    listing: {
      findMany: async () => listings,
      updateMany: async () => ({ count: 1 }),
    },
  };
  const service = {
    generateLinkImageForListing: async (id: string) => {
      calls.push(id);
      if (overrides.generate) return overrides.generate(id);
      return { id, previousShareImageUrl: null, shareImageUrl: `https://r2/listings/${id}/share-v2-abcdefabcdefabcd.jpg`, storyImageUrl: null, updatedAt: at, bytes: 1234 };
    },
  };
  return { prisma, service, calls };
}

test('dry-run reports the plan and never calls the regenerator', async () => {
  const { prisma, service, calls } = fakes();
  const result = await runLinkImageBackfill(prisma as any, service as any, { apply: false, limit: 10, now: at });
  assert.equal(result.mode, 'dry-run');
  assert.deepEqual(result.planned.map((l) => l.id), ['a', 'b', 'e']);
  assert.deepEqual(calls, []);
  assert.deepEqual(result.applied, []);
  assert.equal(result.manifest.entries.length, 0);
});

test('apply regenerates once per planned listing, records before/after in the manifest and isolates failures', async () => {
  const { prisma, service, calls } = fakes({
    generate: async (id) => {
      if (id === 'b') throw new Error('listing_changed_concurrently: b');
      return { id, previousShareImageUrl: null, shareImageUrl: `https://r2/listings/${id}/share-v2-abcdefabcdefabcd.jpg`, storyImageUrl: null, updatedAt: at, bytes: 1234 };
    },
  });
  const result = await runLinkImageBackfill(prisma as any, service as any, { apply: true, limit: 10, now: at });
  assert.equal(result.mode, 'apply');
  assert.deepEqual(calls, ['a', 'b', 'e']);
  assert.deepEqual(result.applied.map((e) => e.id), ['a', 'e']);
  assert.deepEqual(result.failed, [{ id: 'b', slug: 'b', reason: 'listing_changed_concurrently: b' }]);
  assert.equal(result.manifest.version, 1);
  assert.deepEqual(result.manifest.planned, [
    { id: 'a', slug: 'a', previousShareImageUrl: null },
    { id: 'b', slug: 'b', previousShareImageUrl: 'https://r2/listings/b/share.png' },
    { id: 'e', slug: 'e', previousShareImageUrl: null },
  ]);
  assert.equal(result.manifest.entries.length, 2);
  assert.deepEqual(Object.keys(result.manifest.entries[0]).sort(), ['bytes', 'id', 'previousShareImageUrl', 'shareImageUrl', 'slug', 'storyImageUrl', 'updatedAt']);
  assert.equal(result.manifest.entries[0].updatedAt, at.toISOString());
  assert.deepEqual(result.manifest.failed, result.failed);
});

test('the manifest is persisted before the first write, then after every result (write-ahead)', async () => {
  const snapshots: Array<{ callsSoFar: number; entries: number; failed: number; planned: number }> = [];
  const { prisma, service, calls } = fakes({
    generate: async (id) => {
      if (id === 'e') throw new Error('boom');
      return { id, previousShareImageUrl: null, shareImageUrl: `https://r2/listings/${id}/share-v2-abcdefabcdefabcd.jpg`, storyImageUrl: null, updatedAt: at, bytes: 1 };
    },
  });
  await runLinkImageBackfill(prisma as any, service as any, {
    apply: true, limit: 10, now: at,
    persist: async (manifest) => { snapshots.push({ callsSoFar: calls.length, entries: manifest.entries.length, failed: manifest.failed.length, planned: manifest.planned.length }); },
  });
  assert.deepEqual(snapshots, [
    { callsSoFar: 0, entries: 0, failed: 0, planned: 3 },
    { callsSoFar: 1, entries: 1, failed: 0, planned: 3 },
    { callsSoFar: 2, entries: 2, failed: 0, planned: 3 },
    { callsSoFar: 3, entries: 2, failed: 1, planned: 3 },
  ]);
});

test('dry-run never persists a manifest', async () => {
  let persisted = 0;
  const { prisma, service } = fakes();
  await runLinkImageBackfill(prisma as any, service as any, { apply: false, limit: 10, now: at, persist: async () => { persisted += 1; } });
  assert.equal(persisted, 0);
});

test('rollback restores the previous URL only where the database still points at what the backfill wrote', async () => {
  const writes: any[] = [];
  const prisma = {
    listing: {
      findMany: async () => [],
      updateMany: async (args: any) => { writes.push(args); return { count: args.where.id === 'a' ? 1 : 0 }; },
    },
  };
  const manifest: BackfillManifest = {
    version: 1,
    createdAt: at.toISOString(),
    planned: [{ id: 'a', slug: 'a', previousShareImageUrl: null }, { id: 'b', slug: 'b', previousShareImageUrl: 'https://r2/listings/b/share.png' }],
    failed: [],
    entries: [
      { id: 'a', slug: 'a', previousShareImageUrl: null, shareImageUrl: 'https://r2/listings/a/share-v2-1.jpg', storyImageUrl: null, updatedAt: at.toISOString(), bytes: 1 },
      { id: 'b', slug: 'b', previousShareImageUrl: 'https://r2/listings/b/share.png', shareImageUrl: 'https://r2/listings/b/share-v2-1.jpg', storyImageUrl: null, updatedAt: at.toISOString(), bytes: 1 },
    ],
  };
  const result = await rollbackLinkImageBackfill(prisma as any, manifest);
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[0].where, { id: 'a', shareImageUrl: 'https://r2/listings/a/share-v2-1.jpg', updatedAt: at });
  assert.deepEqual(writes[0].data, { shareImageUrl: null, updatedAt: at });
  assert.deepEqual(writes[1].data, { shareImageUrl: 'https://r2/listings/b/share.png', updatedAt: at });
  assert.deepEqual(result, { restored: ['a'], skipped: ['b'] });
});
