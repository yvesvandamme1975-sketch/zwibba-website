import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRecentFeedSection } from '../App/features/home/recent-feed-section.mjs';

test('app feed keeps the API thumbnail and falls back to the actual original', () => {
  const html = renderRecentFeedSection({ listings: [{ slug: 'object', title: 'Objet', priceAmount: 10, priceCurrency: 'USD', thumbnailUrl: 'https://api.test/listings/object/thumbnail', primaryImageUrl: 'https://media.test/original.jpg' }] });
  assert.match(html, /src="https:\/\/api.test\/listings\/object\/thumbnail"/);
  assert.match(html, /onerror="this.onerror=null;this.src=&quot;https:\/\/media.test\/original.jpg&quot;;"/);
});
