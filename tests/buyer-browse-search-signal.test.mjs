import assert from 'node:assert/strict';
import test from 'node:test';

import { createBuyerBrowseController } from '../App/features/home/buyer-browse-controller.mjs';
import { createListingsService } from '../App/services/listings-service.mjs';

function createFeedService() {
  return {
    async getListingDetail(slug) {
      return { slug };
    },
    async listBrowseFeed() {
      return {
        items: [
          {
            categoryId: 'construction',
            categoryLabel: 'Construction',
            locationLabel: 'Gombe',
            slug: 'ciment-simba',
            title: 'Ciment Simba',
          },
          {
            categoryId: 'vehicles',
            categoryLabel: 'Véhicules',
            locationLabel: 'Limete',
            slug: 'toyota-hilux',
            title: 'Toyota Hilux',
          },
        ],
      };
    },
  };
}

test('reports a buyer search with its filtered result count', async () => {
  const calls = [];
  const controller = createBuyerBrowseController({
    listingsService: createFeedService(),
    searchSignalReporter: {
      report(payload) {
        calls.push(payload);
      },
    },
  });

  await controller.loadFeed();
  controller.setSearchQuery('ciment');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].rawQuery, 'ciment');
  assert.equal(calls[0].resultCount, controller.getFilteredFeed().length);
});

test('reports a search that matches no listings with a zero result count', async () => {
  const calls = [];
  const controller = createBuyerBrowseController({
    listingsService: createFeedService(),
    searchSignalReporter: {
      report(payload) {
        calls.push(payload);
      },
    },
  });

  await controller.loadFeed();
  controller.setSearchQuery('introuvable');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].resultCount, 0);
});

test('keeps search working when no signal reporter is provided', async () => {
  const controller = createBuyerBrowseController({
    listingsService: createFeedService(),
  });

  await controller.loadFeed();

  assert.doesNotThrow(() => controller.setSearchQuery('ciment'));
  assert.equal(controller.getFilteredFeed().length, 1);
});

test('listings service exposes a failure-safe search reporting method', async () => {
  const service = createListingsService({
    apiBaseUrl: 'https://api.zwibba.test',
    fetchFn: async () => {
      throw new Error('network unavailable');
    },
  });

  assert.equal(typeof service.reportSearchQuery, 'function');
  await assert.doesNotReject(() =>
    service.reportSearchQuery({
      rawQuery: 'ciment',
      resultCount: 1,
      selectedCategoryId: '',
    }),
  );
});
