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
