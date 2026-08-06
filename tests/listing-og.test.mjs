import assert from 'node:assert/strict';
import test from 'node:test';
import { buildListingOgTags } from '../shared/listing-og.mjs';

const base = 'https://website-production-7a12.up.railway.app';

test('uses the story image and brand title when storyImageUrl is present', () => {
  const html = buildListingOgTags({
    listing: {
      slug: 'bague-or-blanc',
      title: 'Bague or blanc',
      priceAmount: 80000,
      priceCurrency: 'CDF',
      locationLabel: 'Gombe, Kinshasa',
      primaryImageUrl: 'https://cdn/photo.jpg',
      storyImageUrl: 'https://r2/listings/l1/story.png',
    },
    baseUrl: base,
  });
  assert.match(html, /property="og:image" content="https:\/\/r2\/listings\/l1\/story\.png"/);
  assert.match(html, /property="og:image:width" content="1080"/);
  assert.match(html, /property="og:title" content="Je vends sur Zwibba ! Bague or blanc"/);
  assert.match(
    html,
    /property="og:url" content="https:\/\/website-production-7a12\.up\.railway\.app\/annonce\/bague-or-blanc\/"/,
  );
  assert.match(html, /Gombe, Kinshasa/);
  assert.match(html, /80\s?000/);
});

test('falls back to the raw photo (raster, never svg) when no story image', () => {
  const html = buildListingOgTags({
    listing: {
      slug: 'velo-x',
      title: 'Vélo X',
      priceAmount: 50000,
      priceCurrency: 'CDF',
      locationLabel: 'Lemba, Kinshasa',
      primaryImageUrl: 'https://cdn/velo.jpg',
      storyImageUrl: null,
    },
    baseUrl: base,
  });
  assert.match(html, /property="og:image" content="https:\/\/cdn\/velo\.jpg"/);
  assert.doesNotMatch(html, /property="og:image" content="[^"]+\.svg"/);
  assert.doesNotMatch(html, /og:image:width/);
});

test('falls back to the brand og-default.png when no image at all', () => {
  const html = buildListingOgTags({
    listing: {
      slug: 'sans-photo',
      title: 'Sans photo',
      priceAmount: 1000,
      priceCurrency: 'CDF',
      locationLabel: 'Matete',
      primaryImageUrl: null,
      storyImageUrl: null,
    },
    baseUrl: base,
  });
  assert.match(
    html,
    /property="og:image" content="https:\/\/website-production-7a12\.up\.railway\.app\/assets\/brand\/og-default\.png"/,
  );
});

test('formats EUR prices with the fr-BE thousands separator and a euro suffix', () => {
  const html = buildListingOgTags({
    listing: {
      slug: 'canape-cuir',
      title: 'Canapé cuir',
      priceAmount: 250,
      priceCurrency: 'EUR',
      locationLabel: 'Ixelles, Bruxelles',
      primaryImageUrl: 'https://cdn/canape.jpg',
      storyImageUrl: null,
    },
    baseUrl: base,
  });
  assert.match(html, /250\s?€/);
  assert.match(html, /property="og:description" content="250\s?€ — Ixelles, Bruxelles"/);
});

test('formats USD prices with a US$ suffix, matching the API suffix exactly', () => {
  const html = buildListingOgTags({
    listing: {
      slug: 'moto-yamaha',
      title: 'Moto Yamaha',
      priceAmount: 1500,
      priceCurrency: 'USD',
      locationLabel: 'Gombe, Kinshasa',
      primaryImageUrl: 'https://cdn/moto.jpg',
      storyImageUrl: null,
    },
    baseUrl: base,
  });
  assert.match(html, /1\s?500\s?US\$/);
  assert.doesNotMatch(html, /US\$\$/);
});

test('leaves CDF and missing-currency price formatting byte-identical to current behavior', () => {
  const cdfHtml = buildListingOgTags({
    listing: {
      slug: 'sac-a-main',
      title: 'Sac à main',
      priceAmount: 80000,
      priceCurrency: 'CDF',
      locationLabel: 'Gombe, Kinshasa',
      primaryImageUrl: 'https://cdn/sac.jpg',
      storyImageUrl: null,
    },
    baseUrl: base,
  });
  assert.match(
    cdfHtml,
    /property="og:description" content="80\s?000 CDF — Gombe, Kinshasa"/,
  );

  const zeroHtml = buildListingOgTags({
    listing: {
      slug: 'don-vetements',
      title: 'Don vêtements',
      priceAmount: 0,
      priceCurrency: 'CDF',
      locationLabel: 'Matete',
      primaryImageUrl: 'https://cdn/don.jpg',
      storyImageUrl: null,
    },
    baseUrl: base,
  });
  assert.match(zeroHtml, /property="og:description" content="0 CDF — Matete"/);

  const missingHtml = buildListingOgTags({
    listing: {
      slug: 'sans-prix',
      title: 'Sans prix',
      priceAmount: null,
      priceCurrency: 'CDF',
      locationLabel: 'Lemba',
      primaryImageUrl: 'https://cdn/sans-prix.jpg',
      storyImageUrl: null,
    },
    baseUrl: base,
  });
  assert.match(missingHtml, /property="og:description" content="CDF — Lemba"/);
});
