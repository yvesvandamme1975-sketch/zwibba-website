import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('les icônes du menu-toggle ont une taille explicite', () => {
  const css = readFileSync('src/site/styles.css', 'utf8');
  assert.match(css, /\.menu-toggle__icon svg\s*\{[^}]*width:\s*22px/);
});
