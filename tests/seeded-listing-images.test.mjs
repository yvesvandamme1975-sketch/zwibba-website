import assert from 'node:assert/strict';
import test from 'node:test';

import {
  categories,
  listings,
} from '../src/site/content.mjs';
import {
  resolveSeededListingImage,
  seededListingImagesBySlug,
} from '../shared/listing-images.mjs';

test('seeded listing image manifest covers every static listing slug', () => {
  const listingSlugs = listings.map((listing) => listing.slug);

  assert.deepEqual(
    Object.keys(seededListingImagesBySlug).sort(),
    [...listingSlugs].sort(),
  );
});

test('seeded listing image manifest returns bundled raster assets', () => {
  const image = resolveSeededListingImage('samsung-galaxy-a54-neuf-lubumbashi');

  assert.equal(image.src, '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.jpg');
  assert.match(image.alt, /Samsung Galaxy A54/i);
  assert.ok(image.credit.pageUrl.startsWith('https://www.pexels.com/photo/'));
});

test('seeded listing image manifest returns null for unknown slugs', () => {
  assert.equal(resolveSeededListingImage('listing-inconnue'), null);
});

test('seeded catalog splits services and emploi into separate marketplace categories and listings', () => {
  const categorySlugs = categories.map((category) => category.slug);
  const listingCategories = new Map(listings.map((listing) => [listing.slug, listing.category]));

  assert.ok(categorySlugs.includes('services'));
  assert.ok(categorySlugs.includes('emploi'));
  assert.ok(!categorySlugs.includes('jobs_services'));
  assert.equal(listingCategories.get('service-plomberie-urgence-7j7'), 'services');
  assert.equal(listingCategories.get('offre-receptionniste-lubumbashi-centre'), 'emploi');
  assert.ok(
    seededListingImagesBySlug['offre-receptionniste-lubumbashi-centre'],
    'expected a bundled seeded image for the emploi listing',
  );
});
