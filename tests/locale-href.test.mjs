import test from 'node:test';
import assert from 'node:assert/strict';

import { localeHref } from '../src/site/locale-href.mjs';

test('localeHref prefixes a path with the site url prefix', () => {
  assert.equal(localeHref({ urlPrefix: '/be' }, '/annonces/'), '/be/annonces/');
});

test('localeHref leaves the path unchanged when the prefix is empty', () => {
  assert.equal(localeHref({ urlPrefix: '' }, '/annonces/'), '/annonces/');
});

test('localeHref tolerates a missing urlPrefix', () => {
  assert.equal(localeHref({}, '/annonces/'), '/annonces/');
});
