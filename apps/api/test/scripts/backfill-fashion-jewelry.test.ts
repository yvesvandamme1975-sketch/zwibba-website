import assert from 'node:assert/strict';
import test from 'node:test';

import { runBackfillOnce } from '../../scripts/backfill-fashion-jewelry-runner';

function buildMockPrisma(opts: { listings?: any[]; drafts?: any[]; updates?: any[] }) {
  const updates: any[] = opts.updates ?? [];
  return {
    listing: {
      findMany: async () => opts.listings ?? [],
      update: async (args: any) => {
        updates.push({ table: 'listing', ...args });
        return args.data;
      },
    },
    draft: {
      findMany: async () => opts.drafts ?? [],
      update: async (args: any) => {
        updates.push({ table: 'draft', ...args });
        return args.data;
      },
    },
    updates,
  };
}

test('runBackfillOnce dry-runs by default and never mutates', async () => {
  const prisma = buildMockPrisma({
    listings: [
      {
        id: 'l1',
        categoryId: 'fashion',
        attributesJson: { fashion: { itemType: 'dress_skirt', size: 'M' } },
        title: 'Bague or blanc',
        description: '',
      },
    ],
  });

  const result = await runBackfillOnce(prisma as any, { apply: false });

  assert.equal(result.scanned.listings, 1);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.applied.length, 0);
  assert.equal(prisma.updates.length, 0);
});

test('runBackfillOnce writes only when apply is true', async () => {
  const prisma = buildMockPrisma({
    drafts: [
      {
        id: 'd1',
        categoryId: 'fashion',
        attributesJson: { fashion: { itemType: 'tops', size: 'M' } },
        title: "Boucles d'oreilles strass",
        description: 'Fantaisie',
      },
    ],
  });

  const result = await runBackfillOnce(prisma as any, { apply: true });

  assert.equal(result.applied.length, 1);
  assert.equal(prisma.updates.length, 1);
  assert.equal(prisma.updates[0].table, 'draft');
  assert.deepEqual(prisma.updates[0].data.attributesJson, {
    fashion: { itemType: 'jewelry_earrings', size: '' },
  });
});

test('runBackfillOnce stops with a warning if there are more than 500 records to scan', async () => {
  const listings = Array.from({ length: 501 }).map((_, i) => ({
    id: `l${i}`,
    categoryId: 'fashion',
    attributesJson: { fashion: { itemType: 'tops', size: 'M' } },
    title: 'Bague',
    description: '',
  }));

  const prisma = buildMockPrisma({ listings });
  const result = await runBackfillOnce(prisma as any, { apply: true });

  assert.equal(result.aborted, true);
  assert.equal(prisma.updates.length, 0);
});
