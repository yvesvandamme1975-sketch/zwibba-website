import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_FONTS = path.resolve(__dirname, '../../assets/fonts');

test('all four required TTF files exist', () => {
  for (const file of ['Manrope-Regular.ttf', 'Manrope-Medium.ttf', 'Sora-Medium.ttf', 'Sora-Bold.ttf']) {
    assert.ok(existsSync(path.join(ASSETS_FONTS, file)), `missing ${file}`);
  }
});

test('fonts.conf is a valid fontconfig file pointing at the fonts dir', () => {
  const confPath = path.join(ASSETS_FONTS, 'fonts.conf');
  assert.ok(existsSync(confPath));
  const contents = readFileSync(confPath, 'utf-8');
  assert.match(contents, /<dir(?:\s[^>]*)?>.*<\/dir>/);
  assert.match(contents, /fontconfig/i);
});
