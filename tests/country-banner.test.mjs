import assert from 'node:assert/strict';
import test from 'node:test';

import { renderCountrySuggestionBanner } from '../App/components/country-banner.mjs';

test('renders the belgian suggestion with both delegated actions', () => {
  const html = renderCountrySuggestionBanner();
  assert.match(html, /Belgique/);
  assert.match(html, /data-action="accept-country-suggestion"/);
  assert.match(html, /data-action="dismiss-country-suggestion"/);
});
