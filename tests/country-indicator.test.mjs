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

test('app.js expose le pays actif au brand depuis resolveBrowseCountry', () => {
  const src = readFileSync('App/app.js', 'utf8');
  assert.match(src, /ZWIBBA_ACTIVE_COUNTRY_CODE\s*=\s*resolveBrowseCountry\(\)/);
});
