import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createBuyerBrowseController,
  getRenderableRouteKey,
  parseAppRoute,
} from '../App/features/home/buyer-browse-controller.mjs';
import { resolvePhoneCountry } from '../App/utils/phone-country.mjs';

const APP_JS_URL = new URL('../App/app.js', import.meta.url);

async function loadResolveBrowseCountry() {
  const source = await readFile(APP_JS_URL, 'utf8');
  const match = /function resolveBrowseCountry\(\) \{[\s\S]*?\n  \}\n/.exec(source);

  assert.ok(match, 'App/app.js should define a resolveBrowseCountry() function');

  return new Function(
    'state',
    'countryPreference',
    'resolvePhoneCountry',
    `${match[0]}\nreturn resolveBrowseCountry();`,
  );
}

async function buildLoadBuyerFeed() {
  const source = await readFile(APP_JS_URL, 'utf8');
  const resolveBrowseCountryMatch = /function resolveBrowseCountry\(\) \{[\s\S]*?\n  \}\n/.exec(source);
  const loadBuyerFeedMatch = /async function loadBuyerFeed\(\) \{[\s\S]*?\n  \}\n/.exec(source);

  assert.ok(resolveBrowseCountryMatch, 'App/app.js should define a resolveBrowseCountry() function');
  assert.ok(loadBuyerFeedMatch, 'App/app.js should define an async loadBuyerFeed() function');

  const factory = new Function(
    'state',
    'countryPreference',
    'resolvePhoneCountry',
    'buyerBrowseController',
    'renderApp',
    `${resolveBrowseCountryMatch[0]}\n${loadBuyerFeedMatch[0]}\nreturn loadBuyerFeed;`,
  );

  return (state, countryPreference, buyerBrowseController, renderApp) =>
    factory(state, countryPreference, resolvePhoneCountry, buyerBrowseController, renderApp);
}

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

test('parseAppRoute recognizes the in-app listing detail route', () => {
  const route = parseAppRoute('#listing/samsung-galaxy-a54');

  assert.deepEqual(route, {
    slug: 'samsung-galaxy-a54',
    type: 'listing',
  });
});

test('parseAppRoute maps the browser beta shell tabs and thread routes', () => {
  assert.deepEqual(parseAppRoute('#home'), { type: 'sell' });
  assert.deepEqual(parseAppRoute('#sell'), { type: 'sell' });
  assert.deepEqual(parseAppRoute('#buy'), { type: 'buy' });
  assert.deepEqual(parseAppRoute('#capture-result'), { type: 'capture-result' });
  assert.deepEqual(parseAppRoute('#messages'), { type: 'messages' });
  assert.deepEqual(parseAppRoute('#wallet'), { type: 'wallet' });
  assert.deepEqual(parseAppRoute('#profile'), { type: 'profile' });
  assert.deepEqual(parseAppRoute('#thread/thread_1'), {
    threadId: 'thread_1',
    type: 'thread',
  });
});

test('parseAppRoute recognizes public seller routes', () => {
  assert.deepEqual(parseAppRoute('#seller/user_123'), {
    sellerId: 'user_123',
    type: 'seller',
  });
});

test('getRenderableRouteKey preserves dynamic route identity', () => {
  assert.equal(getRenderableRouteKey({ slug: 'a54', type: 'listing' }), 'listing:a54');
  assert.equal(getRenderableRouteKey({ threadId: 'thread_1', type: 'thread' }), 'thread:thread_1');
  assert.equal(getRenderableRouteKey({ sellerId: 'user_a', type: 'seller' }), 'seller:user_a');
  assert.equal(getRenderableRouteKey({ sellerId: 'user_b', type: 'seller' }), 'seller:user_b');
  assert.equal(getRenderableRouteKey({ type: 'profile' }), 'profile');
});

test('parseAppRoute falls back to home for unknown hashes', () => {
  const route = parseAppRoute('#unknown');

  assert.deepEqual(route, {
    type: 'sell',
  });
});

test('buyer browse controller loads the live feed and filters it by search plus category', async () => {
  const controller = createBuyerBrowseController({
    listingsService: {
      async listBrowseFeed() {
        return {
          items: [
            {
              categoryLabel: 'Téléphones & Tablettes',
              categoryId: 'phones_tablets',
              id: 'listing_1',
              locationLabel: 'Golf',
              priceCdf: 450000,
              slug: 'samsung-galaxy-a54',
              title: 'Samsung Galaxy A54',
            },
            {
              categoryLabel: 'Véhicules',
              categoryId: 'vehicles',
              id: 'listing_2',
              locationLabel: 'Bel Air',
              priceCdf: 8000000,
              slug: 'toyota-hilux',
              title: 'Toyota Hilux',
            },
          ],
        };
      },
      async getListingDetail(slug) {
        return {
          slug,
          title: 'Toyota Hilux',
        };
      },
    },
  });

  await controller.loadFeed();
  controller.setSearchQuery('Toyota');
  controller.setSelectedCategoryId('vehicles');

  const filtered = controller.getHomeSections();

  assert.equal(controller.state.feedStatus, 'ready');
  assert.equal(filtered.featuredListings.length, 1);
  assert.equal(filtered.featuredListings[0].slug, 'toyota-hilux');
  assert.equal(filtered.recentListings.length, 0);

  controller.setSearchQuery('');
  controller.setSelectedCategoryId('');

  const unfiltered = controller.getHomeSections();

  assert.equal(unfiltered.featuredListings.length, 2);
});

test('buyer browse controller forwards the session market country to the listings service', async () => {
  const requestedCountryCodes = [];
  const controller = createBuyerBrowseController({
    listingsService: {
      async listBrowseFeed({ countryCode } = {}) {
        requestedCountryCodes.push(countryCode);
        return { items: [] };
      },
      async getListingDetail(slug) {
        return { slug };
      },
    },
  });

  await controller.loadFeed({ countryCode: 'BE' });
  await controller.loadFeed({ countryCode: 'CD' });

  assert.deepEqual(requestedCountryCodes, ['BE', 'CD']);
});

test('resolveBrowseCountry uses the stored preference when there is no session', async () => {
  const resolveBrowseCountry = await loadResolveBrowseCountry();

  const result = resolveBrowseCountry(
    { session: null },
    { getStoredCountry: () => 'BE' },
    resolvePhoneCountry,
  );

  assert.equal(result, 'BE');
});

test('resolveBrowseCountry falls back to CD when there is no session and no stored preference', async () => {
  const resolveBrowseCountry = await loadResolveBrowseCountry();

  const result = resolveBrowseCountry(
    { session: null },
    { getStoredCountry: () => null },
    resolvePhoneCountry,
  );

  assert.equal(result, 'CD');
});

test('resolveBrowseCountry lets an active +243 session win over a stored BE preference', async () => {
  const resolveBrowseCountry = await loadResolveBrowseCountry();

  const result = resolveBrowseCountry(
    { session: { phoneNumber: '+243990000001' } },
    { getStoredCountry: () => 'BE' },
    resolvePhoneCountry,
  );

  assert.equal(result, 'CD');
});

test('loadBuyerFeed resolves the active browse country through resolveBrowseCountry', async () => {
  const source = await readFile(APP_JS_URL, 'utf8');

  assert.match(
    source,
    /async function loadBuyerFeed\(\)[\s\S]*?const countryCode = resolveBrowseCountry\(\)/,
  );
});

test('loadBuyerFeed restarts the fetch when the browse country changes while a fetch is in flight', async () => {
  const loadBuyerFeedFactory = await buildLoadBuyerFeed();

  const requestedCountryCodes = [];
  let deferred = null;
  const buyerBrowseController = {
    loadFeed({ countryCode } = {}) {
      requestedCountryCodes.push(countryCode);
      deferred = createDeferred();
      return deferred.promise;
    },
  };

  const state = {
    buyerFeedCountry: null,
    buyerFeedPromise: null,
    session: null,
  };
  let storedCountry = null;
  const countryPreference = { getStoredCountry: () => storedCountry };
  const renderApp = () => {};

  const loadBuyerFeed = loadBuyerFeedFactory(state, countryPreference, buyerBrowseController, renderApp);

  const firstLoad = loadBuyerFeed();
  const firstDeferred = deferred;

  storedCountry = 'BE';
  loadBuyerFeed();

  firstDeferred.resolve({ items: [] });

  await firstLoad;
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(requestedCountryCodes, ['CD', 'BE']);
});

test('the set-browse-country action persists the chosen market and reloads the buyer feed', async () => {
  const source = await readFile(APP_JS_URL, 'utf8');

  assert.match(
    source,
    /trigger\.dataset\.action === 'set-browse-country'[\s\S]{0,240}countryPreference\.setStoredCountry\(trigger\.dataset\.country\)[\s\S]{0,240}loadBuyerFeed\(\)[\s\S]{0,120}renderApp\(\)/,
  );
});

test('buyer browse controller loads a listing detail and captures errors', async () => {
  const controller = createBuyerBrowseController({
    listingsService: {
      async listBrowseFeed() {
        return { items: [] };
      },
      async getListingDetail() {
        throw new Error('Annonce introuvable.');
      },
    },
  });

  await controller.loadListing('missing-slug');

  assert.equal(controller.state.detailStatus, 'error');
  assert.equal(controller.state.detailError, 'Annonce introuvable.');
});
