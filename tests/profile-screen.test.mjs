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
    profile: {
      area: 'Lubumbashi',
      displayName: 'Boutique Katanga',
      memberSince: '2026-06-01T09:30:00.000Z',
      phoneNumber: '+243990000001',
    },
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
  assert.match(html, /data-action="edit-listing"/);
  assert.match(html, /href="#listing\/samsung-galaxy-a54-128-go"/);
  assert.match(html, /name="displayName"/);
  assert.match(html, /Boutique Katanga/);
  assert.match(html, /app-profile__monogram/);
  assert.match(html, /BK/);
  assert.match(html, /Membre depuis/);
  assert.match(html, /01\/06\/2026/);
  assert.match(html, /data-action="logout"/);
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

test('profile screen renders zero-priced listings as free giveaways', () => {
  const html = renderProfileScreen({
    listings: [
      {
        id: 'listing_free',
        moderationStatus: 'approved',
        priceAmount: 0,
        priceCurrency: 'USD',
        primaryImageUrl: null,
        slug: 'chaise-a-donner',
        title: 'Chaise à donner',
      },
    ],
    session: {
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_123',
    },
    state: 'ready',
  });

  assert.match(html, /À donner/);
  assert.doesNotMatch(html, /0 US\$/);
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
      area: 'Lubumbashi',
      phoneNumber: '+243990000001',
    },
    citySuggestions: ['Likasi', 'Lubumbashi'],
    draftExists: true,
    profileAreaInput: 'L',
    session: {
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_123',
    },
    state: 'ready',
  });

  assert.match(html, /Ma zone/);
  assert.match(html, /data-form="profile-zone"/);
  assert.match(html, /name="areaSearch"/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-controls="profile-city-suggestions"/);
  assert.match(html, /value="L"/);
  assert.match(html, /data-profile-city-feedback/);
  assert.match(html, /data-selected-area=""/);
  assert.match(html, /Likasi/);
  assert.match(html, /Lubumbashi/);
  assert.match(html, /Enregistrer ma zone/);
  assert.match(html, /Revenir au brouillon/);
  assert.match(html, /href="#review"/);
});

test('profile screen submits the current exact-match zone before it has been persisted', () => {
  const html = renderProfileScreen({
    citySuggestions: ['Lubumbashi Centre'],
    listings: [],
    profile: {
      area: '',
      phoneNumber: '+243990000004',
    },
    profileAreaInput: 'Lubumbashi Centre',
    selectedProfileArea: 'Lubumbashi Centre',
    session: {
      canSyncDrafts: true,
      phoneNumber: '+243990000004',
      sessionToken: 'zwibba_session_004',
    },
    state: 'ready',
  });

  assert.match(html, /name="area"/);
  assert.match(html, /value="Lubumbashi Centre"/);
  assert.match(html, /data-selected-area="Lubumbashi Centre"/);
});

test('profile screen keeps an explicitly emptied city search editable', () => {
  const html = renderProfileScreen({
    listings: [],
    profile: {
      area: 'Lubumbashi Centre',
      phoneNumber: '+243990000004',
    },
    profileAreaInput: '',
    selectedProfileArea: '',
    session: {
      canSyncDrafts: true,
      phoneNumber: '+243990000004',
      sessionToken: 'zwibba_session_004',
    },
    state: 'ready',
  });

  assert.match(html, /name="areaSearch"/);
  assert.match(html, /value=""/);
  assert.doesNotMatch(html, /name="areaSearch"[^>]+value="Lubumbashi Centre"/);
});

test('profile screen renders a missing-city action when the typed city has no exact match', () => {
  const html = renderProfileScreen({
    listings: [],
    profileAreaInput: 'Kasumbalesa',
    profileMissingCityLabel: 'Kasumbalesa',
    session: {
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_123',
    },
    state: 'ready',
  });

  assert.match(html, /Ville absente \? Utiliser "Kasumbalesa"/);
  assert.match(html, /data-action="suggest-profile-city"/);
});
