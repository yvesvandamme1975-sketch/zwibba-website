import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import test, { after } from 'node:test';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
// Isolated dist dir so parallel test files never wipe each other's build output.
const distDir = mkdtempSync(join(tmpdir(), 'zwibba-app-entry-dist-'));
const distAppEntry = join(distDir, 'App', 'index.html');

after(() => {
  rmSync(distDir, { force: true, recursive: true });
});

function buildSite() {
  execFileSync('node', ['scripts/build.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, ZWIBBA_DIST_DIR: distDir },
    stdio: 'pipe',
  });
}

test('public App shell uses beta/live copy instead of prototype wording', () => {
  buildSite();

  const html = readFileSync(distAppEntry, 'utf8');

  assert.doesNotMatch(html, /Prototype vendeur/i);
  assert.doesNotMatch(html, /App mobile, version navigateur/i);
  assert.doesNotMatch(html, /Ouvrir le prototype/i);
  assert.match(html, /B[êe]ta/i);
});

test('public App entry is the bare app shell without marketing chrome', () => {
  buildSite();

  const html = readFileSync(distAppEntry, 'utf8');

  assert.doesNotMatch(html, /app-standalone__topbar/);
  assert.doesNotMatch(html, /app-standalone__note/);
  assert.doesNotMatch(html, /app-standalone__frame/);
  assert.doesNotMatch(html, /app-standalone__entry/);
  assert.doesNotMatch(html, /Ouvrir l'app/i);
  assert.doesNotMatch(html, /Retour au site/i);
  assert.match(html, /class="app-shell__viewport"[^>]*data-app-root/i);
});
