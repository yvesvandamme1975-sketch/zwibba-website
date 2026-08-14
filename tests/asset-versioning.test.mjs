import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('les pages construites référencent des assets versionnés', () => {
  execSync('node scripts/build.mjs', { stdio: 'ignore' });
  const html = readFileSync('dist/App/index.html', 'utf8');
  const site = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /\/assets\/app\/app\.js\?v=\d+/);
  assert.match(site, /\/assets\/styles\.css\?v=\d+/);
});

test('server.mjs déclare les bons en-têtes de cache', () => {
  const src = readFileSync('server.mjs', 'utf8');
  assert.match(src, /no-cache/); // HTML + service worker
  assert.match(src, /immutable/); // assets versionnés
});
