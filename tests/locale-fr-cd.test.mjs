import test from 'node:test';
import assert from 'node:assert/strict';

import * as frCd from '../src/site/locales/fr-cd.mjs';
import * as content from '../src/site/content.mjs';

const EXPORT_NAMES = [
  'site',
  'categories',
  'featureSteps',
  'platformHighlights',
  'testimonials',
  'faqs',
  'aboutValues',
  'supportTopics',
  'ambassadorChannels',
  'listings',
];

test('fr-cd locale module exposes the same content as content.mjs', () => {
  for (const name of EXPORT_NAMES) {
    assert.ok(name in frCd, `fr-cd.mjs is missing export "${name}"`);
    assert.ok(name in content, `content.mjs is missing export "${name}"`);
  }
});

for (const name of EXPORT_NAMES.filter((n) => n !== 'site')) {
  test(`fr-cd locale export "${name}" matches content.mjs`, () => {
    assert.deepStrictEqual(frCd[name], content[name]);
  });
}

test('fr-cd locale site export matches content.mjs plus new locale fields', () => {
  const expectedSite = {
    ...content.site,
    htmlLang: 'fr',
    ogLocale: 'fr_CD',
    market: 'CD',
    language: 'fr',
    currency: 'CDF',
    priceLocale: 'fr-FR',
    urlPrefix: '',
  };
  assert.deepStrictEqual(frCd.site, expectedSite);
  assert.equal(frCd.site.ogLocale, content.site.locale);
});
