import assert from 'node:assert/strict';
import test from 'node:test';

import { createListingsService } from '../App/services/listings-service.mjs';

function createJsonResponse(status, jsonValue) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return jsonValue;
    },
  };
}

test('live listings service loads the browse feed from the live API', async () => {
  const requests = [];
  const service = createListingsService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options = {}) => {
      requests.push({
        url,
        ...options,
      });

      return createJsonResponse(200, {
        items: [
          {
            categoryLabel: 'Téléphones & Tablettes',
            id: 'listing_1',
            locationLabel: 'Golf',
            priceCdf: 450000,
            slug: 'samsung-galaxy-a54',
            title: 'Samsung Galaxy A54',
          },
        ],
      });
    },
  });

  const result = await service.listBrowseFeed();

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].slug, 'samsung-galaxy-a54');
  assert.deepEqual(requests, [
    {
      url: 'https://api.example.test/listings',
      method: 'GET',
    },
  ]);
});

test('live listings service loads a listing detail from the live API', async () => {
  const service = createListingsService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options = {}) => {
      assert.equal(url, 'https://api.example.test/listings/samsung-galaxy-a54');
      assert.equal(options.method, 'GET');

      return createJsonResponse(200, {
        categoryLabel: 'Téléphones & Tablettes',
        contactActions: ['whatsapp', 'sms', 'call'],
        id: 'listing_1',
        locationLabel: 'Golf',
        priceCdf: 450000,
        safetyTips: ['Rencontrez le vendeur dans un lieu public.'],
        seller: {
          name: 'Vendeur 0001',
          responseTime: 'Répond en moyenne en 9 min',
          role: 'Vendeur pro',
        },
        slug: 'samsung-galaxy-a54',
        summary: 'Téléphone complet, prêt à être récupéré.',
        title: 'Samsung Galaxy A54',
      });
    },
  });

  const detail = await service.getListingDetail('samsung-galaxy-a54');

  assert.equal(detail.title, 'Samsung Galaxy A54');
  assert.equal(detail.seller.name, 'Vendeur 0001');
});

test('live listings service surfaces a French error when the feed fails', async () => {
  const service = createListingsService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async () => ({
      ok: false,
      status: 503,
      async json() {
        return {
          message: 'Backend unavailable',
        };
      },
    }),
  });

  await assert.rejects(
    () => service.listBrowseFeed(),
    /Backend unavailable/,
  );
});
