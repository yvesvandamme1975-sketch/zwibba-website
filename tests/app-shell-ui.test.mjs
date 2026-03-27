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

test('desktop shell constrains the phone viewport and uses the tab content as the inner scroll area', () => {
  assert.match(
    appStyles,
    /\.app-shell__viewport\s*\{[\s\S]*?height:\s*100%;[\s\S]*?min-height:\s*0;[\s\S]*?(display:\s*(grid|flex);)?/i,
  );
  assert.match(
    appStyles,
    /\.app-tab-shell\s*\{[\s\S]*?height:\s*100%;[\s\S]*?min-height:\s*0;/i,
  );
  assert.match(
    appStyles,
    /\.app-tab-shell__content\s*\{[\s\S]*?overflow-y:\s*auto;/i,
  );
});

test('mobile shell releases the phone viewport so the page owns scrolling', () => {
  assert.match(
    appStyles,
    /@media \(max-width: 640px\) \{[\s\S]*?\.app-shell\s*\{[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*visible;[\s\S]*?\}/i,
  );
  assert.match(
    appStyles,
    /@media \(max-width: 640px\) \{[\s\S]*?\.app-shell__viewport\s*\{[\s\S]*?height:\s*auto;[\s\S]*?overflow:\s*visible;[\s\S]*?\}/i,
  );
  assert.match(
    appStyles,
    /@media \(max-width: 640px\) \{[\s\S]*?\.app-tab-shell\s*\{[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*0;[\s\S]*?\}/i,
  );
  assert.match(
    appStyles,
    /@media \(max-width: 640px\) \{[\s\S]*?\.app-tab-shell__content\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?\}/i,
  );
});
