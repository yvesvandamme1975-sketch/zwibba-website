import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeReviewComment } from '../../src/common/review-comment';

test('normalizeReviewComment returns null for empty optional comments', () => {
  assert.equal(normalizeReviewComment(), null);
  assert.equal(normalizeReviewComment(null), null);
  assert.equal(normalizeReviewComment(''), null);
  assert.equal(normalizeReviewComment('   '), null);
});

test('normalizeReviewComment trims whitespace', () => {
  assert.equal(normalizeReviewComment('  Très bon vendeur  '), 'Très bon vendeur');
});

test('normalizeReviewComment rejects values longer than the max length', () => {
  assert.throws(() => normalizeReviewComment('A'.repeat(281)), /280/);
});

test('normalizeReviewComment rejects profanity', () => {
  for (const value of ['Annonce de merde', 'Vendeur con']) {
    assert.throws(() => normalizeReviewComment(value), /avis/i);
  }
});

test('normalizeReviewComment returns the cleaned value for a valid comment', () => {
  assert.equal(
    normalizeReviewComment('  Livraison rapide et article conforme.  '),
    'Livraison rapide et article conforme.',
  );
});
