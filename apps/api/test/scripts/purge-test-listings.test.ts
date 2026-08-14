import assert from 'node:assert/strict';
import test from 'node:test';

import { isTestListing } from '../../scripts/purge-test-listings';

test('isTestListing flags e2e and beta seller artifacts', () => {
  assert.equal(isTestListing({ slug: 'e2e-galaxy-1774525973423', title: '', sellerPhone: '' }), true);
  assert.equal(isTestListing({ slug: 'x', title: 'Zwibba beta seller 1781344475607', sellerPhone: '' }), true);
  assert.equal(isTestListing({ slug: 'zwibba-test-e2e-123', title: '', sellerPhone: '' }), true);
  assert.equal(isTestListing({ slug: 'verification-live-photo', title: '', sellerPhone: '' }), true);
  assert.equal(isTestListing({ slug: 'x', title: 'ok', sellerPhone: '+243990000002' }), true);
});

test('isTestListing keeps real listings and Belgian seeds', () => {
  assert.equal(isTestListing({ slug: 'piano-numerique-korg-b2', title: 'Piano numérique KORG B2', sellerPhone: '+32470000000' }), false);
  assert.equal(isTestListing({ slug: 'be-velo-cargo-electrique-bruxelles', title: 'Vélo cargo électrique familial', sellerPhone: '+32470000001' }), false);
  assert.equal(isTestListing({ slug: 'service-plomberie-urgence-7j7', title: 'Service plomberie urgence 7j/7', sellerPhone: '+243990009011' }), false);
});
