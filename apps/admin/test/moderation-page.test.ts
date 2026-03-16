import assert from 'node:assert/strict';
import test from 'node:test';

import { renderModerationShell } from '../src/main';

test('admin moderation shell renders api-shaped queue items with outcome labels', async () => {
  const html = await renderModerationShell(async () => {
    return {
      items: [
        {
          id: 'listing-1',
          listingTitle: 'Samsung Galaxy A54 128 Go',
          reasonSummary: 'Photo principale à confirmer',
          sellerPhoneNumber: '+243990000001',
          status: 'pending_manual_review',
        },
        {
          id: 'listing-2',
          listingTitle: 'Toyota Hilux 2019 4x4',
          reasonSummary: 'Documents véhicule à vérifier',
          sellerPhoneNumber: '+243990000002',
          status: 'blocked_needs_fix',
        },
      ],
    };
  });

  assert.match(html, /Samsung Galaxy A54 128 Go/);
  assert.match(html, /\+243990000001/);
  assert.match(html, /pending manual review/i);
  assert.match(html, /Photo principale à confirmer/);
  assert.match(html, /Toyota Hilux 2019 4x4/);
  assert.match(html, /blocked needs fix/i);
});
