import assert from 'node:assert/strict';
import test from 'node:test';

import {
  categories,
  listings,
} from '../src/site/content.mjs';
import {
  resolveSeededCategoryPreviewImage,
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

test('seeded catalog includes one starter listing for each new category that still lacked seeded content', () => {
  const listingCategories = new Map(listings.map((listing) => [listing.slug, listing.category]));

  assert.equal(listingCategories.get('pulverisateur-agricole-16l-lubumbashi'), 'agriculture');
  assert.equal(listingCategories.get('lot-ciment-outils-chantier-lubumbashi'), 'construction');
  assert.equal(listingCategories.get('pack-fournitures-scolaires-universitaires'), 'education');
  assert.equal(listingCategories.get('velo-fitness-loisir-lubumbashi'), 'sports_leisure');
});

test('seeded category preview images cover the new agriculture, construction, education, and sports categories', () => {
  assert.equal(
    resolveSeededCategoryPreviewImage('agriculture')?.src,
    '/assets/listings/pulverisateur-agricole-16l-lubumbashi.jpg',
  );
  assert.equal(
    resolveSeededCategoryPreviewImage('construction')?.src,
    '/assets/listings/lot-ciment-outils-chantier-lubumbashi.jpg',
  );
  assert.equal(
    resolveSeededCategoryPreviewImage('education')?.src,
    '/assets/listings/pack-fournitures-scolaires-universitaires.jpg',
  );
  assert.equal(
    resolveSeededCategoryPreviewImage('sports_leisure')?.src,
    '/assets/listings/velo-fitness-loisir-lubumbashi.jpg',
  );
});
