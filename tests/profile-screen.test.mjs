import assert from 'node:assert/strict';
import test from 'node:test';

import { renderProfileScreen } from '../App/features/profile/profile-screen.mjs';

test('profile screen renders verified session details and seller listing actions', () => {
  const html = renderProfileScreen({
    listings: [
      {
        id: 'listing_approved',
        moderationStatus: 'approved',
        priceAmount: 4256000,
        priceCurrency: 'CDF',
        primaryImageUrl: 'https://pub.example.test/listing-approved.jpg',
        slug: 'samsung-galaxy-a54-128-go',
        title: 'Samsung Galaxy A54 128 Go',
      },
      {
        id: 'listing_pending',
        moderationStatus: 'pending_manual_review',
        priceAmount: 12000000,
        priceCurrency: 'CDF',
        primaryImageUrl: null,
        slug: 'toyota-hilux-2019-4x4',
        title: 'Toyota Hilux 2019 4x4',
      },
      {
        id: 'listing_blocked',
        moderationStatus: 'blocked_needs_fix',
        priceAmount: 1800000,
        priceCurrency: 'CDF',
        primaryImageUrl: null,
        slug: 'appartement-2-chambres',
        title: 'Appartement 2 chambres',
      },
    ],
    session: {
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_123',
    },
    state: 'ready',
  });

  assert.match(html, /Mon profil/);
  assert.match(html, /\+243990000001/);
  assert.match(html, /Session vérifiée/i);
  assert.match(html, /Publiées/);
  assert.match(html, /En revue/);
  assert.match(html, /À corriger/);
  assert.match(html, /Samsung Galaxy A54 128 Go/);
  assert.match(html, /Toyota Hilux 2019 4x4/);
  assert.match(html, /Appartement 2 chambres/);
  assert.match(html, /data-action="activate-boost"/);
  assert.match(html, /href="#listing\/samsung-galaxy-a54-128-go"/);
});

test('profile screen renders mixed listing currencies per announcement', () => {
  const html = renderProfileScreen({
    listings: [
      {
        id: 'listing_cdf',
        moderationStatus: 'approved',
        priceAmount: 4256000,
        priceCurrency: 'CDF',
        primaryImageUrl: null,
        slug: 'samsung-galaxy-a54-128-go',
        title: 'Samsung Galaxy A54 128 Go',
      },
      {
        id: 'listing_usd',
        moderationStatus: 'approved',
        priceAmount: 350,
        priceCurrency: 'USD',
        primaryImageUrl: null,
        slug: 'macbook-pro-13',
        title: 'MacBook Pro 13',
      },
    ],
    session: {
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_123',
    },
    state: 'ready',
  });

  assert.match(html, /4(?:\s|\u202f)256(?:\s|\u202f)000 CDF/);
  assert.match(html, /350 US\$/);
});

test('profile screen shows a verification prompt when no session exists', () => {
  const html = renderProfileScreen({
    listings: [],
    session: null,
    state: 'locked',
  });

  assert.match(html, /Connectez votre session vendeur/i);
  assert.match(html, /href="#auth-welcome"/);
});

test('profile screen shows an explicit seller empty state when no listing exists yet', () => {
  const html = renderProfileScreen({
    listings: [],
    session: {
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_123',
    },
    state: 'ready',
  });

  assert.match(html, /Aucune annonce pour le moment/i);
  assert.match(html, /href="#sell"/);
});

test('profile screen groups seller listings by lifecycle status and exposes restore/relist actions', () => {
  const html = renderProfileScreen({
    listings: [
      {
        canDelete: true,
        canMarkSold: true,
        canPause: true,
        canRelist: false,
        canResume: false,
        canRestore: false,
        id: 'listing_active',
        lifecycleStatus: 'active',
        lifecycleStatusLabel: 'Active',
        moderationStatus: 'approved',
        priceCdf: 4256000,
        primaryImageUrl: 'https://pub.example.test/listing-active.jpg',
        slug: 'samsung-galaxy-a54-128-go',
        title: 'Samsung Galaxy A54 128 Go',
      },
      {
        canDelete: true,
        canMarkSold: false,
        canPause: false,
        canRelist: false,
        canResume: true,
        canRestore: false,
        id: 'listing_paused',
        lifecycleStatus: 'paused',
        lifecycleStatusLabel: 'En pause',
        moderationStatus: 'approved',
        priceCdf: 275000,
        primaryImageUrl: null,
        slug: 'playstation-4-slim',
        title: 'PlayStation 4 Slim',
      },
      {
        canDelete: false,
        canMarkSold: false,
        canPause: false,
        canRelist: true,
        canResume: false,
        canRestore: false,
        id: 'listing_sold',
        lifecycleStatus: 'sold',
        lifecycleStatusLabel: 'Vendue',
        moderationStatus: 'approved',
        priceCdf: 3200000,
        primaryImageUrl: null,
        slug: 'iphone-13',
        soldChannel: 'Vendu sur Zwibba',
        title: 'iPhone 13',
      },
      {
        canDelete: false,
        canMarkSold: false,
        canPause: false,
        canRelist: false,
        canResume: false,
        canRestore: true,
        deletedReason: 'Je republierai plus tard',
        id: 'listing_deleted',
        lifecycleStatus: 'deleted_by_seller',
        lifecycleStatusLabel: 'Archivée',
        moderationStatus: 'approved',
        priceCdf: 25000,
        primaryImageUrl: null,
        restoreUntil: '2026-04-29T08:00:00.000Z',
        slug: 'chaise-en-cuir-marron',
        title: 'Chaise en cuir marron',
      },
    ],
    session: {
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_123',
    },
    state: 'ready',
  });

  assert.match(html, /Actives/);
  assert.match(html, /En pause/);
  assert.match(html, /Vendues/);
  assert.match(html, /Archivées/);
  assert.match(html, /Remettre en ligne/);
  assert.match(html, /Vendu sur Zwibba/);
  assert.match(html, /Je republierai plus tard/);
  assert.match(html, /Restaurable jusqu’au/);
  assert.match(html, /Remettre en vente/);
  assert.match(html, /Restaurer/);
});

test('profile screen renders a persisted seller zone form', () => {
  const html = renderProfileScreen({
    listings: [],
    profile: {
      area: 'Golf',
      phoneNumber: '+243990000001',
    },
    areaOptions: ['Bel Air', 'Golf', 'Lubumbashi Centre'],
    draftExists: true,
    session: {
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_123',
    },
    state: 'ready',
  });

  assert.match(html, /Ma zone/);
  assert.match(html, /data-form="profile-zone"/);
  assert.match(html, /name="area"/);
  assert.match(html, /value="Golf" selected/);
  assert.match(html, /Enregistrer ma zone/);
  assert.match(html, /Revenir au brouillon/);
  assert.match(html, /href="#review"/);
});
