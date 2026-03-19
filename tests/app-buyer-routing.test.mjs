import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBuyerBrowseController,
  parseAppRoute,
} from '../App/features/home/buyer-browse-controller.mjs';

test('parseAppRoute recognizes the in-app listing detail route', () => {
  const route = parseAppRoute('#listing/samsung-galaxy-a54');

  assert.deepEqual(route, {
    slug: 'samsung-galaxy-a54',
    type: 'listing',
  });
});

test('parseAppRoute falls back to home for unknown hashes', () => {
  const route = parseAppRoute('#unknown');

  assert.deepEqual(route, {
    type: 'home',
  });
});

test('buyer browse controller loads the live feed and filters it by search plus category', async () => {
  const controller = createBuyerBrowseController({
    listingsService: {
      async listBrowseFeed() {
        return {
          items: [
            {
              categoryLabel: 'Téléphones & Tablettes',
              categoryId: 'phones_tablets',
              id: 'listing_1',
              locationLabel: 'Golf',
              priceCdf: 450000,
              slug: 'samsung-galaxy-a54',
              title: 'Samsung Galaxy A54',
            },
            {
              categoryLabel: 'Véhicules',
              categoryId: 'vehicles',
              id: 'listing_2',
              locationLabel: 'Bel Air',
              priceCdf: 8000000,
              slug: 'toyota-hilux',
              title: 'Toyota Hilux',
            },
          ],
        };
      },
      async getListingDetail(slug) {
        return {
          slug,
          title: 'Toyota Hilux',
        };
      },
    },
  });

  await controller.loadFeed();
  controller.setSearchQuery('Toyota');
  controller.setSelectedCategoryId('vehicles');

  const filtered = controller.getHomeSections();

  assert.equal(controller.state.feedStatus, 'ready');
  assert.equal(filtered.featuredListings.length, 1);
  assert.equal(filtered.featuredListings[0].slug, 'toyota-hilux');
  assert.equal(filtered.recentListings.length, 0);
});

test('buyer browse controller loads a listing detail and captures errors', async () => {
  const controller = createBuyerBrowseController({
    listingsService: {
      async listBrowseFeed() {
        return { items: [] };
      },
      async getListingDetail() {
        throw new Error('Annonce introuvable.');
      },
    },
  });

  await controller.loadListing('missing-slug');

  assert.equal(controller.state.detailStatus, 'error');
  assert.equal(controller.state.detailError, 'Annonce introuvable.');
});
