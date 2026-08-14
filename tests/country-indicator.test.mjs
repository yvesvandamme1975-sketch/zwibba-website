import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { renderInAppBrand } from '../App/components/in-app-brand.mjs';

test('le brand app affiche le pays actif', () => {
  const be = renderInAppBrand({ countryCode: 'BE' });
  assert.match(be, /🇧🇪/);
  assert.match(be, /Belgique/);
  assert.match(be, /href="#buy"/);

  const cd = renderInAppBrand({ countryCode: 'CD' });
  assert.match(cd, /🇨🇩/);
  assert.match(cd, /RDC/);
  assert.match(cd, /href="#buy"/);
});

test('le brand app conserve la signature compact existante', () => {
  const html = renderInAppBrand({ compact: true, countryCode: 'CD' });
  assert.match(html, /app-brand-mark--compact/);
  assert.match(html, /🇨🇩/);
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
