import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../App/app.js', import.meta.url), 'utf8');
const match = /function primeBuyerRouteState\(route\) \{[\s\S]*?\n  \}\n/.exec(source);
assert.ok(match);

function harness(status, previousRoute = null) {
  const calls = [];
  const state = {
    session: {}, legalStatusStatus: 'ready', profileStatus: 'ready', profile: {},
    currentListingSlug: 'fixture', currentSellerId: 'fixture', currentThreadId: 'fixture',
    sellerPublicStatus: status, threadStatus: status,
  };
  const dependencies = {
    state, buyerBrowseController: { state: { detailStatus: status } },
    requiresTermsAcceptance: () => false,
    loadBuyerListing: slug => calls.push(['listing', slug]),
    loadPublicSeller: id => calls.push(['seller', id]),
    loadThread: id => calls.push(['thread', id]),
    loadProfile: () => calls.push(['profile']),
    getRenderableRouteKey: route => `${route.type}:${route.slug || route.sellerId || route.threadId}`,
    lastRenderedRouteKey: previousRoute,
  };
  const prime = new Function(...Object.keys(dependencies), `${match[0]}\nreturn primeBuyerRouteState;`)(...Object.values(dependencies));
  return { state, calls, prime };
}

for (const [type, key] of [['listing', 'slug'], ['seller', 'sellerId'], ['thread', 'threadId']]) {
  for (const status of ['loading', 'error']) {
    test(`${type} ${status} does not re-fetch on every render with null data`, () => {
      const { calls, prime } = harness(status, `${type}:fixture`);
      prime({ type, [key]: 'fixture' });
      prime({ type, [key]: 'fixture' });
      assert.deepEqual(calls, []);
    });
  }
  test(`${type} still loads an idle route or a different identity after an error`, () => {
    const idle = harness('idle');
    idle.prime({ type, [key]: 'fixture' });
    assert.deepEqual(idle.calls, [[type, 'fixture']]);
    const failed = harness('error');
    failed.prime({ type, [key]: 'another' });
    assert.deepEqual(failed.calls, [[type, 'another']]);
  });
  test(`${type} retries an error when the user re-enters the route`, () => {
    const { calls, prime } = harness('error', 'buy:undefined');
    prime({ type, [key]: 'fixture' });
    assert.deepEqual(calls, [[type, 'fixture']]);
  });
}

test('seller route does not re-fetch an errored account profile on every render', () => {
  const { state, prime, calls } = harness('ready', 'seller:fixture');
  state.sellerPublic = {};
  state.profile = null;
  state.profileStatus = 'error';
  prime({ type: 'seller', sellerId: 'fixture' });
  assert.deepEqual(calls, []);
});
