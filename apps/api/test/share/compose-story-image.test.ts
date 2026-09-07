import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import { composeStoryImage, composeLinkImage } from '../../src/share/compose-story-image';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, '../fixtures/sample-product.png');

test('composeStoryImage returns a 1080x1920 PNG buffer', async () => {
  const photoBuffer = readFileSync(FIXTURE);
  const result = await composeStoryImage({
    photoBuffer,
    title: 'Bague or blanc motif losanges',
    zoneLabel: 'Gombe, Kinshasa',
    priceLabel: '80 000 CDF',
  });

  assert.ok(Buffer.isBuffer(result));
  const meta = await sharp(result).metadata();
  assert.equal(meta.width, 1080);
  assert.equal(meta.height, 1920);
  assert.equal(meta.format, 'png');
});

test('composeStoryImage tolerates very long titles without throwing', async () => {
  const photoBuffer = readFileSync(FIXTURE);
  const result = await composeStoryImage({
    photoBuffer,
    title: 'Très très très très très très très très long titre dépassant largement le cadre normal',
    zoneLabel: 'Lemba, Kinshasa',
    priceLabel: '1 000 000 CDF',
  });

  assert.ok(Buffer.isBuffer(result));
  const meta = await sharp(result).metadata();
  assert.equal(meta.width, 1080);
  assert.equal(meta.height, 1920);
});


test('composeLinkImage produces a separate 1200x630 PNG including escaped long text', async () => {
  const result = await composeLinkImage({ photoBuffer: readFileSync(FIXTURE), title: '<Vélo & accessoires> '.repeat(8), zoneLabel: 'Liège & environs', priceLabel: '0 €' });
  const meta = await sharp(result).metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
  assert.equal(meta.format, 'png');
});
