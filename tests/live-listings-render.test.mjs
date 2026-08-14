import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStartMarker,
  extractEmptyStateTemplate,
  injectLiveListings,
  parseStartMarkers,
  renderLiveListingCards,
} from '../shared/live-listings.mjs';

test('renders a feed item as a listing card with EUR price and locale label', () => {
  const html = renderLiveListingCards({
    items: [
      {
        slug: 'velo-cargo-bruxelles',
        title: 'Vélo cargo électrique',
        categoryId: 'vehicles',
        categoryLabel: 'Véhicules',
        locationLabel: 'Bruxelles',
        priceAmount: 950,
        priceCurrency: 'EUR',
        primaryImageUrl: 'https://cdn.test/velo.jpg',
      },
    ],
    categories: [{ slug: 'vehicles', label: 'Voertuigen' }],
  });

  assert.match(html, /data-listing-card/);
  assert.match(html, /href="\/annonce\/velo-cargo-bruxelles\/"/);
  assert.match(html, /Vélo cargo électrique/);
  assert.match(html, /https:\/\/cdn\.test\/velo\.jpg/);
  assert.match(html, /Voertuigen/);
  assert.doesNotMatch(html, /Véhicules/);
  assert.match(html, /950\s?€/);
});

test('falls back to API category label, CDF prices and default images', () => {
  const html = renderLiveListingCards({
    items: [
      {
        slug: 'lampe-gombe',
        title: 'Lampe & abat-jour <neuf>',
        categoryId: 'home',
        categoryLabel: 'Maison',
        locationLabel: 'Gombe',
        priceAmount: 15000,
        priceCurrency: 'CDF',
        primaryImageUrl: '',
      },
    ],
    categories: [{ slug: 'vehicles', label: 'Voertuigen' }],
  });

  assert.match(html, /Maison/);
  assert.match(html, /15\s?000 CDF/);
  assert.match(html, /\/assets\/brand\/og-default\.png/);
  assert.match(html, /Lampe &amp; abat-jour &lt;neuf&gt;/);
  assert.doesNotMatch(html, /Lampe & abat-jour <neuf>/);
});

test('builds and parses live-listings slot markers', () => {
  assert.equal(
    buildStartMarker({ slot: 'grid', market: 'BE', locale: 'nl-BE' }),
    '<!--zwibba-live-listings slot="grid" market="BE" locale="nl-BE" start-->',
  );

  const html = [
    '<main>',
    buildStartMarker({ slot: 'featured', market: 'BE', locale: 'fr-BE' }),
    '<!--zwibba-live-listings slot="featured" end-->',
    buildStartMarker({ slot: 'grid', market: 'BE', locale: 'fr-BE' }),
    '<!--zwibba-live-listings slot="grid" end-->',
    '</main>',
  ].join('');

  assert.deepEqual(parseStartMarkers(html), [
    { slot: 'featured', market: 'BE', locale: 'fr-BE' },
    { slot: 'grid', market: 'BE', locale: 'fr-BE' },
  ]);
  assert.deepEqual(parseStartMarkers('<main></main>'), []);
});

test('injects replacements between matching markers and keeps surrounding markup', () => {
  const html = [
    '<section>',
    '<div class="feature-strip">',
    buildStartMarker({ slot: 'featured', market: 'CD', locale: 'fr-CD' }),
    '<article>Featured fallback</article>',
    '<!--zwibba-live-listings slot="featured" end-->',
    '</div>',
    '<div class="listing-grid" id="browse-results-grid">',
    buildStartMarker({ slot: 'grid', market: 'CD', locale: 'fr-CD' }),
    '<article>Static card</article>',
    '<!--zwibba-live-listings slot="grid" end-->',
    '</div>',
    '</section>',
  ].join('');
  const cardsHtml = '<article data-listing-card>Live card</article>';

  const injected = injectLiveListings(html, { featured: '', grid: cardsHtml });

  assert.match(injected, /<div class="listing-grid" id="browse-results-grid">/);
  assert.match(injected, /slot="grid" market="CD" locale="fr-CD" start/);
  assert.match(injected, /<article data-listing-card>Live card<\/article>/);
  assert.doesNotMatch(injected, /Static card/);
  assert.doesNotMatch(injected, /Featured fallback/);
  assert.equal(injectLiveListings('<main>No slots</main>', { grid: cardsHtml }), '<main>No slots</main>');
  assert.match(injectLiveListings(html, { grid: cardsHtml }), /Featured fallback/);
});

test('extracts the live-listings empty-state template body', () => {
  assert.equal(
    extractEmptyStateTemplate('<template data-live-listings-empty><p>Vide</p></template>'),
    '<p>Vide</p>',
  );
  assert.equal(extractEmptyStateTemplate('<main></main>'), null);
});
