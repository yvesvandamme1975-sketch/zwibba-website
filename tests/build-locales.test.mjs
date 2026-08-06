import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(repoRoot, 'dist');

function buildSite(env = {}) {
  execFileSync('node', ['scripts/build.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });
}

test('dist/be/index.html is the fr-BE landing page', () => {
  buildSite();

  const target = path.join(distDir, 'be', 'index.html');
  assert.equal(existsSync(target), true, 'dist/be/index.html should exist');

  const html = readFileSync(target, 'utf8');
  assert.match(html, /<html lang="fr">/);
  assert.match(html, /<meta property="og:locale" content="fr_BE" \/>/);
  assert.match(html, /Belgique/);
  assert.doesNotMatch(html, /Lubumbashi/);
});

test('dist/be/nl/index.html is the nl-BE landing page', () => {
  buildSite();

  const target = path.join(distDir, 'be', 'nl', 'index.html');
  assert.equal(existsSync(target), true, 'dist/be/nl/index.html should exist');

  const html = readFileSync(target, 'utf8');
  assert.match(html, /<html lang="nl">/);
  assert.match(html, /zoekertjes/i);
});

test('dist/be/annonces/index.html shows the fr-be fallback and no listing cards', () => {
  buildSite();

  const target = path.join(distDir, 'be', 'annonces', 'index.html');
  assert.equal(existsSync(target), true, 'dist/be/annonces/index.html should exist');

  const html = readFileSync(target, 'utf8');
  assert.match(html, /0 annonce visible/);
  assert.doesNotMatch(html, /href="\/annonce\//);
  assert.doesNotMatch(html, /href="\/be\/annonce\//);
});

test('no static /annonce/ pages are emitted for the belgian locales', () => {
  buildSite();

  assert.equal(existsSync(path.join(distDir, 'be', 'annonce')), false, 'dist/be/annonce should not exist');
  assert.equal(existsSync(path.join(distDir, 'be', 'nl', 'annonce')), false, 'dist/be/nl/annonce should not exist');
});

test('internal hrefs in dist/be/nl/index.html are prefixed with /be/nl/', () => {
  buildSite();

  const target = path.join(distDir, 'be', 'nl', 'index.html');
  const html = readFileSync(target, 'utf8');

  assert.match(html, /href="\/be\/nl\/annonces\/"/, 'nav explore link should be prefixed with /be/nl/');
});

test('assets and the App tree are written once at the root only', () => {
  buildSite();

  assert.equal(existsSync(path.join(distDir, 'be', 'assets')), false, 'dist/be/assets should not exist');
  assert.equal(existsSync(path.join(distDir, 'be', 'nl', 'assets')), false, 'dist/be/nl/assets should not exist');
  assert.equal(existsSync(path.join(distDir, 'be', 'App')), false, 'dist/be/App should not exist');
  assert.equal(existsSync(path.join(distDir, 'be', 'nl', 'App')), false, 'dist/be/nl/App should not exist');
  assert.equal(existsSync(path.join(distDir, 'assets')), true, 'dist/assets should exist at the root');
  assert.equal(existsSync(path.join(distDir, 'App')), true, 'dist/App should exist at the root');
});

test('root fr-CD tree is unaffected by the belgian locale emission', () => {
  buildSite();

  const listingRoot = path.join(distDir, 'annonce');
  const listingPages = readdirSync(listingRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert.ok(listingPages.length >= 6, 'fr-CD should still emit its static listing pages');

  const landing = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.match(landing, /Lubumbashi/);
});
