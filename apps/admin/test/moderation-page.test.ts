import assert from 'node:assert/strict';
import test from 'node:test';

import { renderModerationPage } from '../src/moderation/moderation-page';

test('a pending manual review item renders in the moderation queue', () => {
  const html = renderModerationPage({
    items: [
      {
        id: 'listing-1',
        listingTitle: 'Samsung Galaxy A54 128 Go',
        reasonSummary: 'Photo principale à confirmer',
        sellerPhoneNumber: '+243990000001',
        status: 'pending_manual_review',
      },
    ],
  });

  assert.match(html, /Samsung Galaxy A54 128 Go/);
  assert.match(html, /\+243990000001/);
  assert.match(html, /pending manual review/i);
  assert.match(html, /Photo principale à confirmer/);
});
