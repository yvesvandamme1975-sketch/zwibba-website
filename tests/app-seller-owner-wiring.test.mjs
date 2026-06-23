import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const APP_JS_URL = new URL('../App/app.js', import.meta.url);

test('app seller route detects owner through private profile id, not public phone number', async () => {
  const source = await readFile(APP_JS_URL, 'utf8');

  assert.match(
    source,
    /state\.profile\.id\s*===\s*state\.sellerPublic\.seller\.id/,
  );
  assert.doesNotMatch(
    source,
    /state\.session\.phoneNumber\s*===\s*state\.sellerPublic\.seller\.phoneNumber/,
  );
});

test('app seller route loads the private profile when a session can own the seller page', async () => {
  const source = await readFile(APP_JS_URL, 'utf8');

  assert.match(
    source,
    /route\.type\s*===\s*'seller'[\s\S]{0,240}loadProfile\(\)/,
  );
});
