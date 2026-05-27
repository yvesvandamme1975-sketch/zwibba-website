import assert from 'node:assert/strict';
import test from 'node:test';

import { renderSuccessScreen } from '../App/features/post/success-screen.mjs';

function buildApprovedContext({ storyImageUrl = 'https://r2/l1/story.png' } = {}) {
  return {
    draft: {
      ai: { status: 'ready', message: '' },
      details: { title: 'Bague or blanc', area: 'Gombe', priceAmount: 80000, priceCurrency: 'CDF' },
      photos: [{ photoId: 'p1', publicUrl: 'https://cdn/photo.jpg', kind: 'primary' }],
    },
    listingUrl: 'https://zwibba.com/annonce/bague-or-blanc/',
    listingRoute: '#listing/bague-or-blanc',
    outcome: { status: 'approved', id: 'l1', storyImageUrl },
  };
}

test('success screen renders share buttons including Facebook when listing is approved', () => {
  const html = renderSuccessScreen(buildApprovedContext());
  assert.match(html, /data-action="share-whatsapp-chat"/);
  assert.match(html, /data-action="share-facebook"/);
  assert.match(html, /data-action="share-native"/);
  assert.match(html, /data-action="download-story-image"/);
});

test('success screen embeds the story image URL when present', () => {
  const html = renderSuccessScreen(buildApprovedContext({ storyImageUrl: 'https://r2/l1/story.png' }));
  assert.match(html, /data-story-image-url="https:\/\/r2\/l1\/story\.png"/);
});

test('success screen omits story-image-dependent affordances when storyImageUrl is null', () => {
  const html = renderSuccessScreen(buildApprovedContext({ storyImageUrl: null }));
  assert.doesNotMatch(html, /data-action="share-native"/);
  assert.doesNotMatch(html, /data-action="download-story-image"/);
});
