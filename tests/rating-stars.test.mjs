import assert from 'node:assert/strict';
import test from 'node:test';

import { renderRatingStars } from '../App/utils/rating-stars.mjs';

test('rating stars render the rounded average and review count', () => {
  const html = renderRatingStars({
    average: 4.4,
    count: 12,
  });

  assert.match(html, /aria-label="Note 4,4 sur 5, 12 avis"/);
  assert.match(html, /★★★★☆/);
  assert.match(html, /4,4/);
  assert.match(html, /\(12 avis\)/);
});

test('rating stars render a clear empty state when there are no reviews', () => {
  const html = renderRatingStars({
    average: null,
    count: 0,
  });

  assert.match(html, /Pas encore d&#39;avis/);
  assert.doesNotMatch(html, /NaN/);
});

test('rating stars clamp unsafe numeric input instead of echoing raw values', () => {
  const html = renderRatingStars({
    average: '<img src=x onerror=alert(1)>',
    count: '<script>alert(1)</script>',
  });

  assert.match(html, /Pas encore d&#39;avis/);
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /onerror/);
});
