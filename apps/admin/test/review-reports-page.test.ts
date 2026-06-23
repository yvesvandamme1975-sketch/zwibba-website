import assert from 'node:assert/strict';
import test from 'node:test';

import { renderReviewReportsPage } from '../src/moderation/review-reports-page';

test('admin review reports page renders one block per report with actions', () => {
  const html = renderReviewReportsPage({
    items: [
      {
        commentExcerpt: 'Avis faux laissé par un concurrent.',
        createdAt: '2026-06-23T15:30:00.000Z',
        id: 'report-1',
        rating: 1,
        reason: 'fake',
        reviewId: 'review-1',
        seller: {
          listingSlug: 'samsung-a54',
          listingTitle: 'Samsung Galaxy A54',
        },
      },
    ],
  });

  assert.match(html, /Avis faux laissé par un concurrent\./);
  assert.match(html, /fake/);
  assert.match(html, /Samsung Galaxy A54/);
  assert.match(html, /action="\/review-reports\/report-1\/dismiss"/);
  assert.match(html, /action="\/review-reports\/report-1\/remove-review"/);
  assert.match(html, /Rejeter le signalement/);
  assert.match(html, /Supprimer l’avis/);
});

test('admin review reports page renders an empty state', () => {
  const html = renderReviewReportsPage({
    items: [],
  });

  assert.match(html, /Aucun signalement d’avis en attente\./);
});

test('admin review reports page escapes dynamic report content', () => {
  const html = renderReviewReportsPage({
    items: [
      {
        commentExcerpt: '<script>alert("x")</script>',
        createdAt: '2026-06-23T15:30:00.000Z',
        id: 'report-<1>',
        rating: 5,
        reason: 'spam',
        reviewId: 'review-<1>',
        seller: {
          listingSlug: 'slug-<x>',
          listingTitle: 'Titre <b>dangereux</b>',
        },
      },
    ],
  });

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<b>dangereux<\/b>/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(html, /report-&lt;1&gt;/);
  assert.match(html, /Titre &lt;b&gt;dangereux&lt;\/b&gt;/);
});
