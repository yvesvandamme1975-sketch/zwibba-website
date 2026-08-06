import test from 'node:test';
import assert from 'node:assert/strict';

import * as frCd from '../src/site/locales/fr-cd.mjs';

const LOCALES = [
  {
    name: 'fr-be',
    site: {
      market: 'BE',
      language: 'fr',
      htmlLang: 'fr',
      ogLocale: 'fr_BE',
      currency: 'EUR',
      priceLocale: 'fr-BE',
      urlPrefix: '/be',
    },
    clientLang: 'fr',
  },
  {
    name: 'nl-be',
    site: {
      market: 'BE',
      language: 'nl',
      htmlLang: 'nl',
      ogLocale: 'nl_BE',
      currency: 'EUR',
      priceLocale: 'nl-BE',
      urlPrefix: '/be/nl',
    },
    clientLang: 'nl',
  },
];

/**
 * Builds a canonical "shape" tree for a value:
 * - plain objects -> map of sorted keys to child trees
 * - arrays -> list of child trees (so both length and element shapes compare)
 * - primitives -> their typeof
 */
export function collectKeyTree(value) {
  if (Array.isArray(value)) {
    return value.map((item) => collectKeyTree(item));
  }
  if (value !== null && typeof value === 'object') {
    const tree = {};
    for (const key of Object.keys(value).sort()) {
      tree[key] = collectKeyTree(value[key]);
    }
    return tree;
  }
  return typeof value;
}

const referenceExports = Object.keys(frCd).sort();

for (const { name, site: expectedSiteFields, clientLang } of LOCALES) {
  test(`${name} locale module matches fr-cd structure`, async () => {
    const locale = await import(`../src/site/locales/${name}.mjs`);

    // (a) exactly the same named exports as fr-cd
    assert.deepStrictEqual(
      Object.keys(locale).sort(),
      referenceExports,
      `${name} must expose exactly the same named exports as fr-cd`,
    );

    // (b) recursively identical key trees for every export
    for (const exportName of referenceExports) {
      if (exportName === 'listings' && Array.isArray(locale.listings) && locale.listings.length === 0) {
        // Empty listings are accepted for not-yet-launched markets.
        continue;
      }
      assert.deepStrictEqual(
        collectKeyTree(locale[exportName]),
        collectKeyTree(frCd[exportName]),
        `${name} export "${exportName}" must have the same key tree as fr-cd`,
      );
    }

    // (c) market-specific site fields
    for (const [field, expected] of Object.entries(expectedSiteFields)) {
      assert.equal(
        locale.site[field],
        expected,
        `${name} site.${field} must equal ${JSON.stringify(expected)}`,
      );
    }

    // (d) client language
    assert.equal(locale.ui.client.lang, clientLang);

    // (e) condition codes are machine values and must be identical across locales
    assert.deepStrictEqual(
      locale.ui.browse.conditions.map((c) => c.code),
      frCd.ui.browse.conditions.map((c) => c.code),
      `${name} ui.browse.conditions codes must match fr-cd`,
    );
  });
}
