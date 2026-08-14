import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

import { compareListingsByPrice } from '../src/site/listing-sort.mjs';

test('le tri croissant groupe par devise locale d abord, puis par montant', () => {
  const cards = [
    { price: 1, currency: 'USD' },
    { price: 1000, currency: 'CDF' },
    { price: 25000, currency: 'CDF' },
    { price: 5, currency: 'USD' },
  ];

  const sorted = [...cards].sort((a, b) => compareListingsByPrice(a, b, { localCurrency: 'CDF', direction: 'asc' }));

  assert.deepEqual(sorted.map((card) => `${card.price} ${card.currency}`), ['1000 CDF', '25000 CDF', '1 USD', '5 USD']);
});

test('le tri decroissant garde la devise locale devant puis trie par montant', () => {
  const cards = [
    { price: 1, currency: 'USD' },
    { price: 1000, currency: 'CDF' },
    { price: 25000, currency: 'CDF' },
    { price: 5, currency: 'USD' },
  ];

  const sorted = [...cards].sort((a, b) => compareListingsByPrice(a, b, { localCurrency: 'CDF', direction: 'desc' }));

  assert.deepEqual(sorted.map((card) => `${card.price} ${card.currency}`), ['25000 CDF', '1000 CDF', '5 USD', '1 USD']);
});

test('le build publie la devise des cartes et le module de tri du site', () => {
  execSync('node scripts/build.mjs', { stdio: 'ignore' });

  const html = readFileSync('dist/annonces/index.html', 'utf8');
  assert.match(html, /data-listing-card[^>]+data-currency="CDF"/);
  assert.equal(existsSync('dist/assets/listing-sort.mjs'), true);

  const app = readFileSync('dist/assets/app.js', 'utf8');
  assert.match(app, /from ['\"]\.\/listing-sort\.mjs['\"]/);
  assert.match(app, /dataset.currency/);

  const page = readFileSync('dist/index.html', 'utf8');
  assert.match(page, /<script type=\"module\" src=\"\/assets\/app\.js/);
});

test('le filtre prix exclut les cartes hors devise locale quand il est actif', () => {
  const app = readFileSync('src/site/app.js', 'utf8');

  assert.match(app, /Price filters are denominated in the locale currency/);
  assert.match(app, /priceMatch\s*=\s*cardCurrency === localCurrency && cardPrice >= min && cardPrice <= max/);
});
