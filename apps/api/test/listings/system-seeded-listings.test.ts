import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSystemSeedDefinitions,
  upsertSystemSeedListings,
} from '../../src/listings/system-seeded-listings';

test('system seed definitions cover the starter categories and mark them as system_seed', () => {
  const definitions = buildSystemSeedDefinitions();
  const categoriesBySlug = new Map(
    definitions.map((definition) => [definition.listing.slug, definition.listing.categoryId]),
  );

  assert.equal(categoriesBySlug.get('service-plomberie-urgence-7j7'), 'services');
  assert.equal(categoriesBySlug.get('offre-receptionniste-lubumbashi-centre'), 'emploi');
  assert.equal(categoriesBySlug.get('mangues-et-avocats-frais-du-haut-katanga'), 'food');
  assert.equal(categoriesBySlug.get('pulverisateur-agricole-16l-lubumbashi'), 'agriculture');
  assert.equal(categoriesBySlug.get('lot-ciment-outils-chantier-lubumbashi'), 'construction');
  assert.equal(categoriesBySlug.get('pack-fournitures-scolaires-universitaires'), 'education');
  assert.equal(categoriesBySlug.get('velo-fitness-loisir-lubumbashi'), 'sports_leisure');

  for (const definition of definitions) {
    assert.equal(definition.listing.sourceType, 'system_seed');
    assert.equal(definition.draft.priceAmount, definition.draft.priceCdf);
    assert.equal(definition.draft.priceCurrency, 'CDF');
    assert.equal(definition.listing.priceAmount, definition.listing.priceCdf);
    assert.equal(definition.listing.priceCurrency, 'CDF');
    assert.match(definition.photo.publicUrl, /^\/assets\/listings\//);
  }
});

test('system seed upsert is idempotent and does not duplicate starter records', async () => {
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

  const firstRun = await upsertSystemSeedListings(prisma as any);
  const secondRun = await upsertSystemSeedListings(prisma as any);

  assert.equal(firstRun.total, secondRun.total);
  assert.equal(drafts.size, firstRun.total);
  assert.equal(draftPhotos.size, firstRun.total);
  assert.equal(listings.size, firstRun.total);
  assert.ok(secondRun.updated >= firstRun.total);
});
