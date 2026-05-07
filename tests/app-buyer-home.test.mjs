import assert from 'node:assert/strict';
import test from 'node:test';

import { renderBuyScreen } from '../App/features/home/buy-screen.mjs';
import { sellerCategories } from '../App/demo-content.mjs';
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
        priceAmount: 450000,
        priceCurrency: 'CDF',
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

test('listing cards render USD when a listing is priced in dollars', () => {
  const html = renderHomeScreen({
    categories,
    draft: null,
    featuredListings: [
      {
        categoryId: 'electronics',
        locationLabel: 'Golf',
        priceAmount: 350,
        priceCurrency: 'USD',
        slug: 'macbook-pro-13',
        title: 'MacBook Pro 13',
      },
    ],
    feedStatus: 'ready',
    recentListings: [],
  });

  assert.match(html, /350 US\$/);
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

  assert.match(html, /<img[^>]+src="\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.jpg"/);
  assert.match(
    html,
    /onerror="this\.onerror=null;this\.src=&#39;\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.jpg&#39;;"/,
  );
});

test('buyer listing cards replace legacy dead CDN image URLs with the local category preview immediately', () => {
  const html = renderHomeScreen({
    categories,
    draft: null,
    featuredListings: [
      {
        categoryId: 'phones_tablets',
        categoryLabel: 'Téléphones & Tablettes',
        locationLabel: 'Golf',
        priceCdf: 450000,
        primaryImageUrl: 'https://cdn.zwibba.example/draft-photos/face-avant/photo_face-avant_legacy.jpg',
        slug: 'samsung-galaxy-a54',
        title: 'Samsung Galaxy A54',
      },
    ],
    feedStatus: 'ready',
    recentListings: [],
  });

  assert.match(
    html,
    /<img[^>]+src="\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.jpg"/,
  );
  assert.doesNotMatch(html, /cdn\.zwibba\.example/);
});

test('home screen marks itself as the compact first-viewport screen', () => {
  const html = renderHomeScreen({
    categories,
    draft: null,
    featuredListings: [],
    feedStatus: 'ready',
    recentListings: [],
  });

  assert.match(html, /class="app-home app-screen app-screen--home"/);
});

test('buyer home renders the expanded category chips including Emplois', () => {
  const html = renderHomeScreen({
    categories: sellerCategories,
    draft: null,
    featuredListings: [],
    feedStatus: 'ready',
    recentListings: [],
  });

  assert.match(html, /Alimentation/);
  assert.match(html, /Agriculture/);
  assert.match(html, /Bricolage ?\/ ?Construction/);
  assert.match(html, /[ÉE]cole ?\/ ?Universit[ée]/);
  assert.match(html, /Musique/);
  assert.match(html, /Sant[ée]/);
  assert.match(html, /Beaut[ée]/);
  assert.match(html, /Emplois/);
  assert.match(html, /Sports et loisirs/);
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

test('buy screen hides the recent section when no recent listings are available', () => {
  const html = renderBuyScreen({
    categories,
    featuredListings: [
      {
        categoryId: 'beauty',
        locationLabel: 'Lubumbashi Centre',
        priceAmount: 5,
        priceCurrency: 'CDF',
        slug: 'mini-flacon-poivre-noir-jasmin',
        title: 'Mini flacon de parfum "Poivre Noir Jasmin"',
      },
    ],
    feedStatus: 'ready',
    recentListings: [],
  });

  assert.match(html, /En avant/);
  assert.doesNotMatch(html, /<h3>Récent<\/h3>/);
  assert.doesNotMatch(html, /Flux acheteur/);
  assert.doesNotMatch(html, /Aucune annonce ne correspond à vos filtres pour le moment\./);
});
