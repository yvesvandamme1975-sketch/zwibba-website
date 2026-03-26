import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distAppEntry = join(repoRoot, 'dist', 'App', 'index.html');

function buildSite() {
  execFileSync('node', ['scripts/build.mjs'], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'pipe',
  });
}

async function readBuiltAppEntry() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (existsSync(distAppEntry)) {
      return readFileSync(distAppEntry, 'utf8');
    }

    await delay(25);
  }

  return readFileSync(distAppEntry, 'utf8');
}

test('public App shell uses beta/live copy instead of prototype wording', async () => {
  buildSite();

  const html = await readBuiltAppEntry();

  assert.doesNotMatch(html, /Prototype vendeur/i);
  assert.doesNotMatch(html, /App mobile, version navigateur/i);
  assert.doesNotMatch(html, /Ouvrir le prototype/i);
  assert.match(html, /B[êe]ta/i);
  assert.match(html, /Ouvrir l'app/i);
});
