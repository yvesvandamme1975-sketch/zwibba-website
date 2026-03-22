import assert from 'node:assert/strict';
import test from 'node:test';

import { renderHomeScreen } from '../App/features/home/home-screen.mjs';

const categories = [
  { id: 'phones_tablets', label: 'Téléphones' },
  { id: 'vehicles', label: 'Véhicules' },
];

test('home screen shows buyer loading state while live listings are loading', () => {
  const html = renderHomeScreen({
    categories,
    draft: null,
    featuredListings: [],
    feedStatus: 'loading',
    recentListings: [],
  });

  assert.match(html, /Chargement des annonces/i);
});

test('home screen shows a buyer empty state when no live listing matches', () => {
  const html = renderHomeScreen({
    categories,
    draft: null,
    featuredListings: [],
    feedStatus: 'ready',
    recentListings: [],
    searchQuery: 'Tesla',
    selectedCategoryId: 'vehicles',
  });

  assert.match(html, /Aucune annonce ne correspond/i);
  assert.match(html, /Tesla/);
});

test('listing cards link to in-app buyer detail routes', () => {
  const html = renderHomeScreen({
    categories,
    draft: null,
    featuredListings: [
      {
        categoryId: 'phones_tablets',
        locationLabel: 'Golf',
        priceCdf: 450000,
        slug: 'samsung-galaxy-a54',
        title: 'Samsung Galaxy A54',
      },
    ],
    feedStatus: 'ready',
    recentListings: [],
  });

  assert.match(html, /href="#listing\/samsung-galaxy-a54"/);
  assert.match(html, /450\u202f000 CDF|450 000 CDF/);
});

test('buyer listing cards render the primary image when the live feed provides one', () => {
  const html = renderHomeScreen({
    categories,
    draft: null,
    featuredListings: [
      {
        categoryId: 'phones_tablets',
        locationLabel: 'Golf',
        priceCdf: 450000,
        primaryImageUrl: 'https://cdn.zwibba.example/listings/samsung-a54.jpg',
        slug: 'samsung-galaxy-a54',
        title: 'Samsung Galaxy A54',
      },
    ],
    feedStatus: 'ready',
    recentListings: [],
  });

  assert.match(html, /<img[^>]+src="https:\/\/cdn\.zwibba\.example\/listings\/samsung-a54\.jpg"/);
});

test('buyer listing cards keep the media placeholder when no image is available', () => {
  const html = renderHomeScreen({
    categories,
    draft: null,
    featuredListings: [
      {
        categoryId: 'vehicles',
        locationLabel: 'Bel Air',
        priceCdf: 8000000,
        slug: 'toyota-hilux',
        title: 'Toyota Hilux',
      },
    ],
    feedStatus: 'ready',
    recentListings: [],
  });

  assert.match(html, /class="app-home__listing-media"/);
  assert.doesNotMatch(html, /<img[^>]+class="app-home__listing-image"/);
});
