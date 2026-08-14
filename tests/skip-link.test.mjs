import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('une seule définition du skip-link, cachée hors écran par défaut', () => {
  execSync('node scripts/build.mjs', { stdio: 'ignore' });

  const html = readFileSync('dist/index.html', 'utf8');
  assert.doesNotMatch(html, /skip-link\s*\{[^}]*left:\s*-9999px/);

  const css = readFileSync('dist/assets/styles.css', 'utf8');
  assert.match(css, /\.skip-link[^}]*position:\s*fixed/);
  assert.match(css, /\.skip-link:focus-visible/);
});
