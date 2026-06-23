import assert from 'node:assert/strict';
import test from 'node:test';

import { renderSellerPublicScreen } from '../App/features/profile/seller-public-screen.mjs';

test('public seller screen renders identity and active listing cards', () => {
  const html = renderSellerPublicScreen({
    listings: [
      {
        categoryLabel: 'Téléphones & Tablettes',
        id: 'listing_1',
        locationLabel: 'Lubumbashi',
        priceAmount: 4256000,
        priceCurrency: 'CDF',
        primaryImageUrl: 'https://cdn.zwibba.example/samsung-a54.jpg',
        slug: 'samsung-a54',
        title: 'Samsung A54',
      },
      {
        categoryLabel: 'Maison',
        id: 'listing_2',
        locationLabel: 'Likasi',
        priceAmount: 0,
        priceCurrency: 'CDF',
        primaryImageUrl: null,
        slug: 'chaise-a-donner',
        title: 'Chaise à donner',
      },
    ],
    seller: {
      displayName: 'Boutique Katanga',
      memberSince: '2026-06-01T09:30:00.000Z',
    },
    state: 'ready',
  });

  assert.match(html, /Boutique Katanga/);
  assert.match(html, /app-profile__monogram/);
  assert.match(html, /BK/);
  assert.match(html, /Membre depuis/);
  assert.match(html, /01\/06\/2026/);
  assert.match(html, /Samsung A54/);
  assert.match(html, /Chaise à donner/);
  assert.match(html, /href="#listing\/samsung-a54"/);
  assert.match(html, /4(?:\s|\u202f)256(?:\s|\u202f)000 CDF/);
  assert.match(html, /À donner/);
});

test('public seller screen renders neutral fallback identity and an empty state', () => {
  const html = renderSellerPublicScreen({
    listings: [],
    seller: {
      displayName: '',
      memberSince: '2026-06-01T09:30:00.000Z',
    },
    state: 'ready',
  });

  assert.match(html, /Vendeur Zwibba/);
  assert.match(html, /app-profile__monogram/);
  assert.match(html, />Z</);
  assert.match(html, /Aucune annonce active/i);
});
