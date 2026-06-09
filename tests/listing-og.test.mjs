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
