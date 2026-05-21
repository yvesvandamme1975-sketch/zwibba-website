import assert from 'node:assert/strict';
import test from 'node:test';

import { renderInAppBrand } from '../App/components/in-app-brand.mjs';

test('renderInAppBrand omits badge markup when no badge option is provided', () => {
  const html = renderInAppBrand({ subtitle: 'Vendez en un clic' });
  assert.doesNotMatch(html, /app-brand-mark__badge/);
});

test('renderInAppBrand renders the badge slot when badge is provided', () => {
  const html = renderInAppBrand({ subtitle: 'Vendez en un clic', badge: 'Beta' });
  assert.match(html, /class="app-brand-mark__badge"[^>]*>\s*Beta\s*</);
});

test('renderInAppBrand escapes badge content', () => {
  const html = renderInAppBrand({ badge: '<script>x</script>' });
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>x<\/script>/);
});
