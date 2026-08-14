import assert from 'node:assert/strict';
import test from 'node:test';

import { upsertBelgianSeedListings } from '../../src/listings/belgian-seed-listings';

test('belgian seed upsert is idempotent and writes EUR BE listings', async () => {
  const drafts = new Map<string, Record<string, unknown>>();
  const draftPhotos = new Map<string, Record<string, unknown>>();
  const listings = new Map<string, Record<string, unknown>>();

  const prisma = {
    draft: {
      upsert: async ({ create, update, where }: any) => {
        const nextValue = drafts.has(where.id)
          ? { ...drafts.get(where.id), ...update, id: where.id }
          : { ...create, id: where.id };
        drafts.set(where.id, nextValue);
        return nextValue;
      },
    },
    draftPhoto: {
      upsert: async ({ create, update, where }: any) => {
        const nextValue = draftPhotos.has(where.id)
          ? { ...draftPhotos.get(where.id), ...update, id: where.id }
          : { ...create, id: where.id };
        draftPhotos.set(where.id, nextValue);
        return nextValue;
      },
    },
    listing: {
      findUnique: async ({ where }: any) => listings.get(where.slug) ?? null,
      upsert: async ({ create, update, where }: any) => {
        const existing = listings.get(where.slug);
        const nextValue = existing
          ? { ...existing, ...update, slug: where.slug }
          : { ...create, slug: where.slug };
        listings.set(where.slug, nextValue);
        return nextValue;
      },
    },
  };

  const firstRun = await upsertBelgianSeedListings(prisma as any);
  const slugsAfterFirstRun = [...listings.keys()];
  const secondRun = await upsertBelgianSeedListings(prisma as any);

  assert.equal(firstRun.total, secondRun.total);
  assert.equal(firstRun.created, firstRun.total);
  assert.equal(secondRun.updated, firstRun.total);
  assert.equal(drafts.size, firstRun.total);
  assert.equal(draftPhotos.size, firstRun.total);
  assert.equal(listings.size, firstRun.total);
  assert.deepEqual([...new Set(slugsAfterFirstRun)], slugsAfterFirstRun);
  assert.deepEqual([...listings.keys()], slugsAfterFirstRun);

  for (const listing of listings.values()) {
    assert.equal(listing.countryCode, 'BE');
    assert.equal(listing.priceCurrency, 'EUR');
    assert.equal(Number.isInteger(listing.priceAmount), true);
    assert.equal(listing.priceCdf, listing.priceAmount);
    assert.equal(listing.moderationStatus, 'approved');
  }
});
