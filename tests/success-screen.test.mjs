import assert from 'node:assert/strict';
import test from 'node:test';

import { renderSuccessScreen } from '../App/features/post/success-screen.mjs';

function buildApprovedContext({
  listingUrl = 'https://zwibba.com/annonce/bague-or-blanc/',
  storyImageUrl = 'https://r2/l1/story.png',
} = {}) {
  return {
    draft: {
      ai: { status: 'ready', message: '' },
      details: { title: 'Bague or blanc', area: 'Gombe', priceAmount: 80000, priceCurrency: 'CDF' },
      photos: [{ photoId: 'p1', publicUrl: 'https://cdn/photo.jpg', kind: 'primary' }],
    },
    listingUrl,
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

test('success screen whatsapp link uses the api.whatsapp.com endpoint', () => {
  const html = renderSuccessScreen(buildApprovedContext());
  assert.match(html, /href="https:\/\/api\.whatsapp\.com\/send\?text=[^"]+"/);
  assert.doesNotMatch(html, /href="https:\/\/wa\.me/);
});

test('success screen share affordances point to the public /annonce/<slug>/ url', () => {
  const html = renderSuccessScreen(buildApprovedContext({ listingUrl: '/annonce/mon-annonce/' }));
  const whatsappShare = html.match(/<a[^>]*data-action="share-whatsapp-chat"[^>]*>/s)?.[0] ?? '';
  const facebookShare = html.match(/<button[^>]*data-action="share-facebook"[^>]*>/s)?.[0] ?? '';

  assert.match(whatsappShare, /href="[^"]*%2Fannonce%2Fmon-annonce%2F[^"]*"/);
  assert.match(facebookShare, /data-listing-url="\/annonce\/mon-annonce\/"/);
  assert.doesNotMatch(whatsappShare, /#listing\//);
  assert.doesNotMatch(facebookShare, /#listing\//);
});

test('success screen embeds the story image URL when present', () => {
  const html = renderSuccessScreen(buildApprovedContext({ storyImageUrl: 'https://r2/l1/story.png' }));
  assert.match(html, /data-story-image-url="https:\/\/r2\/l1\/story\.png"/);
});

test('success screen exposes a native share affordance even without a story image', () => {
  const html = renderSuccessScreen(buildApprovedContext({ storyImageUrl: '' }));
  assert.match(html, /data-action="share-native"/);
  assert.match(html, /data-share-image-url="https:\/\/cdn\/photo\.jpg"/);
  assert.doesNotMatch(html, /data-action="download-story-image"/);
});

test('success screen omits story-image download when storyImageUrl is null', () => {
  const html = renderSuccessScreen(buildApprovedContext({ storyImageUrl: null }));
  assert.doesNotMatch(html, /data-action="download-story-image"/);
});

test('success screen renders a single unified share button instead of per-platform buttons', () => {
  const html = renderSuccessScreen({
    draft: {
      details: {
        area: 'Lubumbashi Centre',
        categoryId: 'electronics',
        priceAmount: 250000,
        priceCurrency: 'CDF',
        title: 'Radio vintage',
      },
      photos: [],
    },
    listingRoute: '#listing/radio-vintage',
    listingUrl: '/annonce/radio-vintage/',
    outcome: {
      id: 'listing_unified_share_1',
      listingSlug: 'radio-vintage',
      status: 'approved',
      storyImageUrl: 'https://cdn.example/story.png',
    },
  });
  assert.match(html, /data-action="share-listing"/);
  assert.match(html, /Partager mon annonce/);
  assert.match(html, /data-share-slug="radio-vintage"/);
  assert.doesNotMatch(html, /data-action="share-whatsapp-chat"/);
  assert.doesNotMatch(html, /data-action="share-facebook"/);
  assert.doesNotMatch(html, /data-action="share-native"/);
  assert.doesNotMatch(html, /data-action="download-story-image"/);
  assert.match(html, /data-action="copy-listing-link"/);
});
