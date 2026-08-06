import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(repoRoot, 'dist');
const appEntryPath = path.join(distDir, 'App', 'index.html');
const contactEntryPath = path.join(distDir, 'contact', 'index.html');

function buildSite(env = {}) {
  execFileSync('node', ['scripts/build.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });
}

async function readBuiltFile(target) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (existsSync(target)) {
      return readFileSync(target, 'utf8');
    }

    await delay(25);
  }

  return readFileSync(target, 'utf8');
}

test('support whatsapp env vars expose per-market numbers on the App page and the contact page', async () => {
  buildSite({
    ZWIBBA_SUPPORT_WHATSAPP_CD: '+243111222333',
    ZWIBBA_SUPPORT_WHATSAPP_BE: '',
  });

  const appHtml = await readBuiltFile(appEntryPath);
  const contactHtml = await readBuiltFile(contactEntryPath);

  assert.match(
    appHtml,
    /window\.ZWIBBA_SUPPORT_WHATSAPP\s*=\s*\{"CD":"\+243111222333","BE":""\};/,
  );
  assert.match(contactHtml, /https:\/\/wa\.me\/243111222333/);
  assert.match(contactHtml, /RDC/);
});

test('support whatsapp env vars expose both markets when both are configured', async () => {
  buildSite({
    ZWIBBA_SUPPORT_WHATSAPP_CD: '+243111222333',
    ZWIBBA_SUPPORT_WHATSAPP_BE: '+32499000001',
  });

  const appHtml = await readBuiltFile(appEntryPath);
  const contactHtml = await readBuiltFile(contactEntryPath);

  assert.match(
    appHtml,
    /window\.ZWIBBA_SUPPORT_WHATSAPP\s*=\s*\{"CD":"\+243111222333","BE":"\+32499000001"\};/,
  );
  assert.match(contactHtml, /https:\/\/wa\.me\/243111222333/);
  assert.match(contactHtml, /https:\/\/wa\.me\/32499000001/);
  assert.match(contactHtml, /Belgique/);
});

test('support whatsapp links are hidden from both pages when no env vars are configured', async () => {
  buildSite({
    ZWIBBA_SUPPORT_WHATSAPP_CD: '',
    ZWIBBA_SUPPORT_WHATSAPP_BE: '',
  });

  const appHtml = await readBuiltFile(appEntryPath);
  const contactHtml = await readBuiltFile(contactEntryPath);

  assert.match(appHtml, /window\.ZWIBBA_SUPPORT_WHATSAPP\s*=\s*\{"CD":"","BE":""\};/);
  assert.doesNotMatch(contactHtml, /wa\.me\//);
  assert.doesNotMatch(appHtml, /wa\.me\//);
});
