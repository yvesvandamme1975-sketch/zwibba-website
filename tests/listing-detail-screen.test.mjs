import assert from 'node:assert/strict';
import test from 'node:test';

import { renderListingDetailScreen } from '../App/features/listings/listing-detail-screen.mjs';

test('listing detail screen renders the buyer detail state inside /App', () => {
  const html = renderListingDetailScreen({
    detail: {
      categoryLabel: 'Téléphones & Tablettes',
      contactPhoneNumber: '+243990000001',
      contactActions: ['whatsapp', 'sms', 'call'],
      id: 'listing_1',
      images: [
        'https://cdn.zwibba.example/listings/samsung-a54-front.jpg',
        'https://cdn.zwibba.example/listings/samsung-a54-back.jpg',
      ],
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
    selectedImageIndex: 1,
    state: 'ready',
  });

  assert.match(html, /Retour aux annonces/);
  assert.match(html, /Samsung Galaxy A54/);
  assert.match(html, /450\u202f000 CDF|450 000 CDF/);
  assert.match(html, /Vendeur 0001/);
  assert.match(html, /Conseils de sécurité/);
  assert.match(html, /Envoyer un message/);
  assert.match(html, /data-action="start-thread"/);
  assert.match(html, /data-listing-id="listing_1"/);
  assert.match(html, /Appeler/);
  assert.match(html, /href="tel:\+243990000001"/);
  assert.match(html, /href="#buy"/);
  assert.match(html, /<img[^>]+class="app-detail__image"[^>]+src="\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.jpg"/);
  assert.match(html, /class="app-detail__thumbstrip"/);
  assert.match(html, /data-action="select-listing-image"/);
  assert.match(html, /data-image-index="1"/);
  assert.match(html, /app-detail__thumbnail is-active/);
  assert.match(
    html,
    /onerror="this\.onerror=null;this\.src=&#39;\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.jpg&#39;;"/,
  );
});

test('listing detail screen swaps legacy dead CDN image URLs for a local preview before render', () => {
  const html = renderListingDetailScreen({
    detail: {
      categoryId: 'phones_tablets',
      categoryLabel: 'Téléphones & Tablettes',
      contactActions: ['whatsapp'],
      id: 'listing_1',
      locationLabel: 'Golf',
      priceCdf: 450000,
      primaryImageUrl: 'https://cdn.zwibba.example/draft-photos/face-avant/photo_face-avant_legacy.jpg',
      safetyTips: ['Rencontrez le vendeur dans un lieu public.'],
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

  assert.match(
    html,
    /<img[^>]+class="app-detail__image"[^>]+src="\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.jpg"/,
  );
  assert.doesNotMatch(html, /cdn\.zwibba\.example/);
});

test('listing detail screen keeps a hero placeholder when no image is available', () => {
  const html = renderListingDetailScreen({
    detail: {
      categoryLabel: 'Électronique',
      contactActions: ['message'],
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

test('listing detail screen hides thumbnails when there is only one image', () => {
  const html = renderListingDetailScreen({
    detail: {
      categoryId: 'home_garden',
      categoryLabel: 'Maison',
      contactActions: ['message'],
      id: 'listing_4',
      images: ['https://pub.example.test/draft-photos/chair/primary.jpg'],
      locationLabel: 'Bel Air',
      priceCdf: 25000,
      primaryImageUrl: 'https://pub.example.test/draft-photos/chair/primary.jpg',
      safetyTips: ['Évitez les paiements anticipés.'],
      seller: {
        name: 'Particulier 0002',
        responseTime: 'Répond en moyenne en 9 min',
        role: 'Particulier',
      },
      slug: 'chaise-en-cuir-marron',
      summary: 'Chaise en cuir marron.',
      title: 'Chaise en cuir marron',
    },
    state: 'ready',
  });

  assert.doesNotMatch(html, /app-detail__thumbstrip/);
});

test('listing detail screen falls back to a human category label from categoryId', () => {
  const html = renderListingDetailScreen({
    detail: {
      categoryId: 'home_garden',
      categoryLabel: '',
      contactActions: ['message'],
      id: 'listing_3',
      locationLabel: 'Bel Air',
      priceCdf: 25000,
      primaryImageUrl: null,
      safetyTips: ['Évitez les paiements anticipés.'],
      seller: {
        name: 'Particulier 0002',
        responseTime: 'Répond en moyenne en 9 min',
        role: 'Particulier',
      },
      slug: 'chaise-en-cuir-marron',
      summary: 'Chaise en cuir marron.',
      title: 'Chaise en cuir marron',
    },
    state: 'ready',
  });

  assert.match(html, /<span>Maison<\/span>/);
});

test('listing detail screen renders Emplois as the human label for emploi', () => {
  const html = renderListingDetailScreen({
    detail: {
      categoryId: 'emploi',
      categoryLabel: '',
      contactActions: ['message'],
      id: 'listing_job_1',
      locationLabel: 'Bel Air',
      priceCdf: 25000,
      primaryImageUrl: null,
      safetyTips: ['Évitez les paiements anticipés.'],
      seller: {
        name: 'Particulier 0002',
        responseTime: 'Répond en moyenne en 9 min',
        role: 'Particulier',
      },
      slug: 'offre-receptionniste',
      summary: 'Offre de réceptionniste.',
      title: 'Offre réceptionniste',
    },
    state: 'ready',
  });

  assert.match(html, /<span>Emplois<\/span>/);
});

test('listing detail screen renders a loading state', () => {
  const html = renderListingDetailScreen({
    state: 'loading',
  });

  assert.match(html, /Chargement de l'annonce/i);
});

test('listing detail screen replaces buyer contact actions with owner lifecycle actions', () => {
  const html = renderListingDetailScreen({
    detail: {
      canDelete: true,
      canMarkSold: true,
      canPause: true,
      canRelist: false,
      canRestore: false,
      categoryId: 'electronics',
      categoryLabel: 'Électronique',
      contactActions: [],
      deletedReason: null,
      id: 'listing_owner_1',
      lifecycleStatus: 'active',
      lifecycleStatusLabel: 'Active',
      locationLabel: 'Golf',
      priceCdf: 980000,
      primaryImageUrl: 'https://pub.example.test/laptop.jpg',
      restoreUntil: null,
      safetyTips: ['Évitez les paiements anticipés.'],
      seller: {
        name: 'Particulier 0001',
        responseTime: 'Répond en moyenne en 9 min',
        role: 'Particulier',
      },
      slug: 'ordinateur-portable-test',
      soldChannel: null,
      summary: 'Ordinateur portable propre.',
      title: 'Ordinateur portable test',
      viewerRole: 'owner',
    },
    state: 'ready',
  });

  assert.match(html, /Gérer mon annonce/);
  assert.match(html, /Mettre en pause/);
  assert.match(html, /Marquer comme vendue/);
  assert.match(html, /Supprimer l’annonce/);
  assert.match(html, /data-action="listing-lifecycle"/);
  assert.doesNotMatch(html, /Envoyer un message/);
  assert.doesNotMatch(html, /href="tel:/);
});

test('listing detail screen renders an in-app error state', () => {
  const html = renderListingDetailScreen({
    errorMessage: 'Annonce introuvable.',
    state: 'error',
  });

  assert.match(html, /Annonce introuvable/i);
  assert.match(html, /Retour aux annonces/i);
  assert.match(html, /href="#buy"/);
});
