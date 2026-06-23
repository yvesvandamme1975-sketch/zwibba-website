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
      ratingAverage: 4.5,
      ratingCount: 2,
    },
    reviews: [
      {
        buyer: {
          displayName: 'Client sérieux',
        },
        comment: 'Vendeur fiable et rapide.',
        createdAt: '2026-06-22T14:00:00.000Z',
        rating: 5,
      },
      {
        buyer: {
          displayName: 'Acheteur Zwibba',
        },
        comment: null,
        createdAt: '2026-06-21T14:00:00.000Z',
        rating: 4,
      },
    ],
    state: 'ready',
  });

  assert.match(html, /Boutique Katanga/);
  assert.match(html, /app-profile__monogram/);
  assert.match(html, /BK/);
  assert.match(html, /Membre depuis/);
  assert.match(html, /01\/06\/2026/);
  assert.match(html, /Note 4,5 sur 5, 2 avis/);
  assert.match(html, /Client sérieux/);
  assert.match(html, /CS/);
  assert.match(html, /Vendeur fiable et rapide\./);
  assert.match(html, /22\/06\/2026/);
  assert.match(html, /Acheteur Zwibba/);
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
      ratingAverage: null,
      ratingCount: 0,
    },
    reviews: [],
    state: 'ready',
  });

  assert.match(html, /Vendeur Zwibba/);
  assert.match(html, /app-profile__monogram/);
  assert.match(html, />Z</);
  assert.match(html, /Pas encore d&#39;avis/);
  assert.match(html, /Aucune annonce active/i);
});

test('public seller screen renders seller replies and owner reply forms', () => {
  const reviews = [
    {
      buyer: {
        displayName: 'Client sérieux',
      },
      comment: 'Livraison rapide.',
      createdAt: '2026-06-22T14:00:00.000Z',
      id: 'review_replied',
      rating: 5,
      sellerReply: 'Merci pour votre confiance.',
      sellerReplyAt: '2026-06-22T18:30:00.000Z',
    },
    {
      buyer: {
        displayName: 'Acheteur Zwibba',
      },
      comment: 'Produit conforme.',
      createdAt: '2026-06-21T14:00:00.000Z',
      id: 'review_open',
      rating: 4,
      sellerReply: null,
      sellerReplyAt: null,
    },
  ];

  const ownerHtml = renderSellerPublicScreen({
    isOwner: true,
    listings: [],
    seller: {
      displayName: 'Boutique Katanga',
      memberSince: '2026-06-01T09:30:00.000Z',
      ratingAverage: 4.5,
      ratingCount: 2,
    },
    reviews,
    state: 'ready',
  });

  assert.match(ownerHtml, /Réponse du vendeur/);
  assert.match(ownerHtml, /Merci pour votre confiance\./);
  assert.match(ownerHtml, /22\/06\/2026/);
  assert.match(ownerHtml, /data-action="submit-seller-reply"/);
  assert.match(ownerHtml, /data-review-id="review_open"/);
  assert.doesNotMatch(ownerHtml, /data-review-id="review_replied"[\s\S]*data-action="submit-seller-reply"/);

  const visitorHtml = renderSellerPublicScreen({
    isOwner: false,
    listings: [],
    seller: {
      displayName: 'Boutique Katanga',
      memberSince: '2026-06-01T09:30:00.000Z',
      ratingAverage: 4.5,
      ratingCount: 2,
    },
    reviews,
    state: 'ready',
  });

  assert.doesNotMatch(visitorHtml, /data-action="submit-seller-reply"/);
});
