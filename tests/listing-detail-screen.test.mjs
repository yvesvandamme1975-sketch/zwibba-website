import assert from 'node:assert/strict';
import test from 'node:test';

import { renderListingDetailScreen } from '../App/features/listings/listing-detail-screen.mjs';

test('listing detail screen renders the buyer detail state inside /App', () => {
  const html = renderListingDetailScreen({
    detail: {
      categoryLabel: 'Téléphones & Tablettes',
      contactActions: ['whatsapp', 'sms', 'call'],
      id: 'listing_1',
      locationLabel: 'Golf',
      priceCdf: 450000,
      primaryImageUrl: 'https://cdn.zwibba.example/listings/samsung-a54.jpg',
      safetyTips: [
        'Rencontrez le vendeur dans un lieu public.',
        'Vérifiez le produit avant de payer.',
      ],
      seller: {
        name: 'Vendeur 0001',
        responseTime: 'Répond en moyenne en 9 min',
        role: 'Vendeur pro',
      },
      slug: 'samsung-galaxy-a54',
      summary: 'Téléphone complet, prêt à être récupéré.',
      title: 'Samsung Galaxy A54',
    },
    state: 'ready',
  });

  assert.match(html, /Retour aux annonces/);
  assert.match(html, /Samsung Galaxy A54/);
  assert.match(html, /450\u202f000 CDF|450 000 CDF/);
  assert.match(html, /Vendeur 0001/);
  assert.match(html, /Conseils de sécurité/);
  assert.match(html, /WhatsApp/);
  assert.match(html, /SMS/);
  assert.match(html, /Appeler/);
  assert.match(html, /href="#home"/);
  assert.match(html, /<img[^>]+class="app-detail__image"[^>]+src="https:\/\/cdn\.zwibba\.example\/listings\/samsung-a54\.jpg"/);
  assert.match(
    html,
    /onerror="this\.onerror=null;this\.src=&#39;\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.svg&#39;;"/,
  );
});

test('listing detail screen keeps a hero placeholder when no image is available', () => {
  const html = renderListingDetailScreen({
    detail: {
      categoryLabel: 'Électronique',
      contactActions: ['whatsapp'],
      id: 'listing_2',
      locationLabel: 'Kenya',
      priceCdf: 980000,
      primaryImageUrl: null,
      safetyTips: ['Évitez les paiements anticipés.'],
      seller: {
        name: 'Particulier 0003',
        responseTime: 'Répond en moyenne en 15 min',
        role: 'Particulier',
      },
      slug: 'playstation-4-slim',
      summary: 'Console en bon état.',
      title: 'PlayStation 4 Slim',
    },
    state: 'ready',
  });

  assert.match(html, /class="app-detail__media app-detail__media--placeholder"/);
  assert.doesNotMatch(html, /class="app-detail__image"/);
});

test('listing detail screen renders a loading state', () => {
  const html = renderListingDetailScreen({
    state: 'loading',
  });

  assert.match(html, /Chargement de l'annonce/i);
});

test('listing detail screen renders an in-app error state', () => {
  const html = renderListingDetailScreen({
    errorMessage: 'Annonce introuvable.',
    state: 'error',
  });

  assert.match(html, /Annonce introuvable/i);
  assert.match(html, /Retour aux annonces/);
});
