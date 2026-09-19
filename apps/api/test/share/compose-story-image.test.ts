import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import { composeStoryImage, composeLinkImage, buildLinkLockupSvg, linkImageLayout, LINK_WIDTH, LINK_HEIGHT } from '../../src/share/compose-story-image';

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


test('composeLinkImage produces a 1200x630 JPEG under the WhatsApp preview limit, with escaped long text', async () => {
  const result = await composeLinkImage({ photoBuffer: readFileSync(FIXTURE), title: '<Vélo & accessoires> '.repeat(8), zoneLabel: 'Liège & environs', priceLabel: '0 €' });
  const meta = await sharp(result).metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
  assert.equal(meta.format, 'jpeg');
  assert.ok(result.length < 300_000, `link image must stay under 300 KB, got ${result.length}`);
});

async function solidJpeg(width: number, height: number, orientation?: number): Promise<Buffer> {
  let image = sharp({ create: { width, height, channels: 3, background: '#ff00ff' } }).jpeg({ quality: 90 });
  if (orientation) image = image.withMetadata({ orientation });
  return image.toBuffer();
}

async function pixel(buffer: Buffer, x: number, y: number): Promise<{ r: number; g: number; b: number }> {
  const { data } = await sharp(buffer).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2] };
}
const isMagenta = (p: { r: number; g: number; b: number }) => p.r > 200 && p.g < 80 && p.b > 200;

test('EXIF orientation 6/8 phone photos are laid out on their oriented (portrait) size, never stretched', async () => {
  const layout = linkImageLayout({ width: 1, height: 1 });
  const box = layout.photoBox;
  const midY = box.top + Math.round(box.height / 2);
  for (const orientation of [6, 8]) {
    // Stored landscape 1200x600, displayed portrait 600x1200 once oriented.
    const result = await composeLinkImage({ photoBuffer: await solidJpeg(1200, 600, orientation), title: 'Téléphone', zoneLabel: 'Mons', priceLabel: '5 €' });
    const meta = await sharp(result).metadata();
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 630);
    // Portrait fit: the photo is narrower than its box, so the box edges show the darkened backdrop.
    assert.ok(!isMagenta(await pixel(result, box.left + 12, midY)), `orientation ${orientation}: photo stretched to the box edge`);
    assert.ok(isMagenta(await pixel(result, Math.round(LINK_WIDTH / 2), midY)), `orientation ${orientation}: photo missing at the centre`);
    // Portrait fit uses the full box height.
    assert.ok(isMagenta(await pixel(result, Math.round(LINK_WIDTH / 2), box.top + 6)), `orientation ${orientation}: photo does not fill the box height`);
  }
  // Control: the same stored landscape without orientation fills the box width.
  const landscape = await composeLinkImage({ photoBuffer: await solidJpeg(1200, 600), title: 'Téléphone', zoneLabel: 'Mons', priceLabel: '5 €' });
  assert.ok(isMagenta(await pixel(landscape, box.left + 12, midY)), 'landscape photo should reach the box edge');
});

test('composeLinkImage stays under 300 KB even for a noisy, hard-to-compress photo', async () => {
  const noise = Buffer.alloc(2000 * 1500 * 3);
  let seed = 7;
  for (let i = 0; i < noise.length; i += 1) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; noise[i] = seed & 0xff; }
  const photoBuffer = await sharp(noise, { raw: { width: 2000, height: 1500, channels: 3 } }).png().toBuffer();
  const result = await composeLinkImage({ photoBuffer, title: 'Bruit', zoneLabel: 'Test', priceLabel: '1 €' });
  assert.ok(result.length <= 300_000, `noisy link image must stay under 300 KB, got ${result.length}`);
  assert.equal((await sharp(result).metadata()).format, 'jpeg');
});

test('link image lockup reads "Je vends sur" with the Zwibba logo', () => {
  assert.match(buildLinkLockupSvg(), /Je vends sur/);
  assert.match(buildLinkLockupSvg(), /Zwibba|zwibba/i);
});

test('link image layout keeps the photo undistorted and the lockup inside the central square crop', () => {
  const square = { left: (LINK_WIDTH - LINK_HEIGHT) / 2, right: (LINK_WIDTH + LINK_HEIGHT) / 2 };
  const inside = (box: { left: number; top: number; width: number; height: number }) =>
    box.left >= square.left && box.left + box.width <= square.right && box.top >= 0 && box.top + box.height <= LINK_HEIGHT;
  for (const photo of [{ width: 4000, height: 3000 }, { width: 1080, height: 1080 }, { width: 600, height: 1200 }, { width: 3000, height: 800 }]) {
    const layout = linkImageLayout(photo);
    assert.ok(inside(layout.photo), `photo box escapes the safe square for ${photo.width}x${photo.height}`);
    assert.ok(inside(layout.lockup), `lockup escapes the safe square for ${photo.width}x${photo.height}`);
    assert.ok(layout.lockup.top >= layout.photo.top + layout.photo.height, 'lockup sits below the photo');
    const ratio = layout.photo.width / layout.photo.height;
    assert.ok(Math.abs(ratio - photo.width / photo.height) < 0.02, `aspect ratio changed for ${photo.width}x${photo.height}`);
    assert.ok(layout.photo.width === layout.photoBox.width || layout.photo.height === layout.photoBox.height, 'photo fills its box on one axis');
    assert.ok(layout.photo.width <= layout.photoBox.width && layout.photo.height <= layout.photoBox.height, 'photo stays inside its box');
  }
});
