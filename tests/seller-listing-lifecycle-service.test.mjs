import assert from 'node:assert/strict';
import test from 'node:test';

import { createSellerListingsService } from '../App/services/seller-listings-service.mjs';

test('seller listings service posts lifecycle actions with the seller session', async () => {
  const requests = [];
  const service = createSellerListingsService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options) => {
      requests.push({
        options,
        url,
      });

      return {
        ok: true,
        async json() {
          return {
            id: 'listing_1',
            lifecycleStatus: 'sold',
            soldChannel: 'Vendu sur Zwibba',
          };
        },
      };
    },
  });

  const result = await service.applyLifecycleAction({
    action: 'mark_sold',
    listingId: 'listing_1',
    reasonCode: 'sold_on_zwibba',
    session: {
      sessionToken: 'zwibba_session_123',
    },
  });

  assert.equal(result.lifecycleStatus, 'sold');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.example.test/listings/listing_1/lifecycle');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.headers.authorization, 'Bearer zwibba_session_123');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    action: 'mark_sold',
    reasonCode: 'sold_on_zwibba',
  });
});
