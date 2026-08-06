import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appStyles = readFileSync(path.join(repoRoot, 'App', 'app.css'), 'utf8');

test('app shell fills the viewport height as a centered column', () => {
  assert.match(
    appStyles,
    /\.app-shell\s*\{[\s\S]*?width:\s*min\(100%,\s*520px\);[\s\S]*?margin:\s*0 auto;[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;/,
  );
});

test('phone mockup and marketing chrome styles are removed', () => {
  assert.doesNotMatch(appStyles, /\.app-standalone__frame/);
  assert.doesNotMatch(appStyles, /\.app-standalone__note/);
  assert.doesNotMatch(appStyles, /\.app-standalone__topbar/);
  assert.doesNotMatch(appStyles, /\.app-standalone__brand/);
  assert.doesNotMatch(appStyles, /\.app-standalone__entry/);
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

test('mobile shell fixes the tab nav to the viewport bottom and reserves content space', () => {
  assert.match(
    appStyles,
    /@media \(max-width: 640px\) \{[\s\S]*?\.app-tab-shell__nav\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?left:\s*0;[\s\S]*?right:\s*0;[\s\S]*?bottom:\s*0;[\s\S]*?\}/i,
  );
  assert.match(
    appStyles,
    /@media \(max-width: 640px\) \{[\s\S]*?\.app-tab-shell__content\s*\{[\s\S]*?padding-bottom:\s*calc\([\s\S]*?var\(--app-mobile-nav-height\)[\s\S]*?\);[\s\S]*?\}/i,
  );
});

test('mobile footer keeps wallet on one line for narrow Android widths', () => {
  assert.match(
    appStyles,
    /@media \(max-width: 640px\) \{[\s\S]*?\.app-tab-shell__nav-item\s*\{[\s\S]*?font-size:\s*0\.62rem;[\s\S]*?\}/i,
  );
  assert.match(
    appStyles,
    /@media \(max-width: 640px\) \{[\s\S]*?\.app-tab-shell__nav-label\s*\{[\s\S]*?white-space:\s*nowrap;[\s\S]*?overflow-wrap:\s*normal;[\s\S]*?word-break:\s*normal;[\s\S]*?\}/i,
  );
});
