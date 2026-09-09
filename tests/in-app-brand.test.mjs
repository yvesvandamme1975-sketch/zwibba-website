import assert from 'node:assert/strict';
import test from 'node:test';

import { renderInAppBrand } from '../App/components/in-app-brand.mjs';

test('brand keeps the name untranslated and separate from the market', () => {
  const html = renderInAppBrand({ countryCode: 'BE' });
  assert.match(html, /class="app-topbar"/);
  assert.match(html, /<strong[^>]*translate="no"[^>]*>Zwibba<\/strong>/);
  assert.match(html, /alt=""[^>]*width="32"[^>]*height="32"/);
  assert.ok(html.indexOf('Zwibba</strong>') < html.indexOf('data-market-context'));
});

test('legacy compact and marketing options never shrink or crowd the signature', () => {
  const html = renderInAppBrand({ subtitle: 'Vendez en un clic', badge: 'Beta' });
  assert.doesNotMatch(html, /Beta|Vendez en un clic|app-brand-mark__badge/);
  assert.equal(renderInAppBrand({ compact: true }), renderInAppBrand());
});

test('unknown and malicious countries are omitted without injecting markup', () => {
  const html = renderInAppBrand({ countryCode: '<script>x</script>', badge: '<script>x</script>' });
  assert.doesNotMatch(html, /<script>|data-market-context|data-market-menu/);
  assert.match(html, /Zwibba/);
});

test('market selection is opt in and exposes native accessible controls', () => {
  const html = renderInAppBrand({ countryCode: 'BE', allowMarketSwitch: true });
  assert.match(html, /<details[^>]*data-market-menu/);
  assert.match(html, /<summary[^>]*data-market-toggle[^>]*aria-label="Marché actif : Belgique. Choisir le marché"/);
  assert.match(html, /data-country="BE"[^>]*aria-pressed="true"/);
  assert.match(html, /data-country="CD"[^>]*aria-pressed="false"/);
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:\s|>)/);
});
