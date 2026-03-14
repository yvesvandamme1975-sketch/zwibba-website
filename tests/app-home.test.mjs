import assert from 'node:assert/strict';
import test from 'node:test';

import { createListingDraftFromFirstPhoto } from '../App/models/listing-draft.mjs';
import { renderHomeScreen } from '../App/features/home/home-screen.mjs';

const featuredListings = [
  {
    id: 'listing-1',
    title: 'Samsung Galaxy A54 neuf',
    priceLabel: '450 000 CDF',
    location: 'Bel Air, Lubumbashi',
    publishedAt: 'Il y a 18 min',
  },
];

const recentListings = [
  {
    id: 'listing-2',
    title: 'Canapé trois places',
    priceLabel: '700 000 CDF',
    location: 'Golf, Lubumbashi',
    publishedAt: 'Il y a 42 min',
  },
];

const categories = [
  { id: 'phones_tablets', label: 'Téléphones' },
  { id: 'vehicles', label: 'Véhicules' },
  { id: 'real_estate', label: 'Immobilier' },
];

test('Continuer mon brouillon appears when a draft exists', () => {
  const draft = createListingDraftFromFirstPhoto({
    photoUrl: '/assets/demo/phone-front.jpg',
  });

  const html = renderHomeScreen({
    draft,
    featuredListings,
    recentListings,
    categories,
  });

  assert.match(html, /Continuer mon brouillon/);
});

test('Prendre une photo appears when no draft exists', () => {
  const html = renderHomeScreen({
    draft: null,
    featuredListings,
    recentListings,
    categories,
  });

  assert.match(html, /Prendre une photo/);
});

test('post entry card renders above the feed', () => {
  const html = renderHomeScreen({
    draft: null,
    featuredListings,
    recentListings,
    categories,
  });

  assert.ok(
    html.indexOf('data-post-entry-card') < html.indexOf('data-recent-feed-section'),
    'expected post entry card markup before recent feed markup',
  );
});

test('home screen shows the Zwibba in-app brand mark', () => {
  const html = renderHomeScreen({
    draft: null,
    featuredListings,
    recentListings,
    categories,
  });

  assert.match(html, /\/assets\/brand\/favicon\.svg/);
  assert.match(html, /Zwibba/);
});
