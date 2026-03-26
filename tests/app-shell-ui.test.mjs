import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appStyles = readFileSync(path.join(repoRoot, 'App', 'app.css'), 'utf8');

test('mobile app shell hides the standalone marketing note so the app starts first', () => {
  assert.match(
    appStyles,
    /@media \(max-width: 640px\) \{[\s\S]*?\.app-standalone__note\s*\{\s*display:\s*none;\s*\}/,
  );
});

test('desktop shell gives more space to the phone and less to the landing copy', () => {
  assert.match(
    appStyles,
    /@media \(min-width: 920px\) \{[\s\S]*?grid-template-columns:\s*minmax\(280px,\s*360px\)\s*minmax\(460px,\s*520px\)/,
  );
});

test('buyer chips and bottom navigation have explicit active-state styling', () => {
  assert.match(appStyles, /\.app-home__chip\.is-active\s*\{/);
  assert.match(appStyles, /\.app-tab-shell__nav-item\s*\{[\s\S]*?font-size:\s*0\.82rem;/);
});
