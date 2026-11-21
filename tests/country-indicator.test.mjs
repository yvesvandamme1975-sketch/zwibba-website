import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { renderInAppBrand } from '../App/components/in-app-brand.mjs';

test('le brand app affiche le pays actif', () => {
  const be = renderInAppBrand({ countryCode: 'BE' });
  assert.match(be, /Belgique/);
  assert.match(be, /data-market-context/);
  assert.doesNotMatch(be, /<a |<button|<summary/);

  const cd = renderInAppBrand({ countryCode: 'CD' });
  assert.match(cd, /RDC/);
  assert.doesNotMatch(cd, /<a |<button|<summary/);
});

test('le brand app conserve la signature lisible dans les sous-vues', () => {
  const html = renderInAppBrand({ compact: true, countryCode: 'CD' });
  assert.match(html, /app-topbar/);
  assert.match(html, /RDC/);
  assert.doesNotMatch(html, /app-brand-mark--compact/);
});

test('la vitrine affiche un badge pays statique par locale', () => {
  execSync('node scripts/build.mjs', { stdio: 'ignore' });
  assert.match(readFileSync('dist/index.html', 'utf8'), /site-country-badge[^>]*>\s*🇨🇩\s*<span>RDC<\/span>/);
  assert.match(readFileSync('dist/be/index.html', 'utf8'), /site-country-badge[^>]*>\s*🇧🇪\s*<span>Belgique<\/span>/);
  assert.match(readFileSync('dist/be/nl/index.html', 'utf8'), /site-country-badge[^>]*>\s*🇧🇪\s*<span>België<\/span>/);
});

test('app.js distingue le marché consulté du pays du compte dans les en-têtes', () => {
  const src = readFileSync('App/app.js', 'utf8');
  const expression = src.match(/window\.ZWIBBA_ACTIVE_COUNTRY_CODE\s*=([^;]+);/)[1];
  const country = new Function('state', 'route', 'resolvePhoneCountry', 'resolveBrowseCountry', `return ${expression}`);
  for (const type of ['buy', 'sell', 'listing', 'seller']) {
    assert.equal(country({ session: { phoneNumber: '+32' } }, { type }, () => 'BE', () => 'CD'), 'CD');
  }
  for (const type of ['profile', 'wallet', 'messages', 'capture', 'review', 'publish']) {
    assert.equal(country({ session: { phoneNumber: '+32' } }, { type }, () => 'BE', () => 'CD'), 'BE');
    assert.equal(country({ session: null }, { type }, () => 'BE', () => 'CD'), 'CD');
  }
});
