import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const repoRoot = '/Users/pc/zwibba-website';
const distDir = path.join(repoRoot, 'dist');

function buildSite(env = {}) {
  execFileSync('node', ['scripts/build.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });
}

async function withServer(run) {
  buildSite();

  const port = 4311;
  const server = spawn('node', ['server.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  });

  try {
    let ready = false;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        await delay(100);
      }
    }

    assert.equal(ready, true, 'server should become reachable');
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.kill('SIGTERM');
    await delay(150);
  }
}

test('build creates the full static site map required by the Zwibba website plan', () => {
  buildSite();

  const distEntries = new Set(readdirSync(distDir));
  const requiredPages = [
    'index.html',
    'App/index.html',
    'annonces/index.html',
    'ambassadeur/index.html',
    'a-propos/index.html',
    'contact/index.html',
    'r/index.html',
    'robots.txt',
    'sitemap.xml',
  ];

  for (const page of requiredPages) {
    assert.equal(existsSync(path.join(distDir, page)), true, `${page} should exist`);
  }

  assert.equal(distEntries.has('App'), true, 'App directory should exist');

  const listingRoot = path.join(distDir, 'annonce');
  const listingPages = readdirSync(listingRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert.ok(listingPages.length >= 6, 'expected at least six pre-rendered listing detail pages');
});

test('landing page ships the key conversion sections from the plan', () => {
  buildSite();

  const landing = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.match(landing, /Zwibba/i);
  assert.match(landing, /Vendez en un clic/i);
  assert.match(landing, /Google Play/i);
  assert.match(landing, /AppGallery/i);
  assert.match(landing, /IA|intelligence artificielle/i);
  assert.match(landing, /Lubumbashi/i);
});

test('app entry page opens the interactive flow instead of linking to the current home hash', () => {
  buildSite();

  const appEntry = readFileSync(path.join(distDir, 'App/index.html'), 'utf8');
  assert.match(appEntry, /Ouvrir le prototype/);
  assert.match(appEntry, /href="#capture"/i);
});

test('site shell includes accessibility hooks and page-level structured data', () => {
  buildSite();

  const landing = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const browse = readFileSync(path.join(distDir, 'annonces/index.html'), 'utf8');
  const contact = readFileSync(path.join(distDir, 'contact/index.html'), 'utf8');

  assert.match(landing, /Aller au contenu/i);
  assert.match(landing, /id="main-content"/i);
  assert.match(browse, /CollectionPage/i);
  assert.match(contact, /ContactPage/i);
  assert.match(contact, /autocomplete="name"/i);
  assert.match(contact, /autocomplete="email"/i);
});

test('browse page exposes category discovery and marketplace filters', () => {
  buildSite();

  const browse = readFileSync(path.join(distDir, 'annonces/index.html'), 'utf8');
  assert.match(browse, /Immobilier/i);
  assert.match(browse, /V[ée]hicules/i);
  assert.match(browse, /T[ée]l[ée]phones/i);
  assert.match(browse, /Prix/i);
  assert.match(browse, /[ÉE]tat/i);
  assert.match(browse, /Plus r[ée]cents|Recent/i);
});

test('listing detail pages include social metadata, contact actions, and safety tips', () => {
  buildSite();

  const listingRoot = path.join(distDir, 'annonce');
  const [firstListing] = readdirSync(listingRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const detail = readFileSync(path.join(listingRoot, firstListing.name, 'index.html'), 'utf8');

  assert.match(detail, /property="og:title"/i);
  assert.match(detail, /property="og:description"/i);
  assert.match(detail, /WhatsApp/i);
  assert.match(detail, /SMS/i);
  assert.match(detail, /Call|Appeler/i);
  assert.match(detail, /[ÉE]vitez de payer [àa] l(?:'|&#39;)avance/i);
});

test('runtime serves referral short links through the dedicated referral page', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/r/ZWIB-A3K9`, { signal: AbortSignal.timeout(3000) });
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Transmission du code en cours/i);
    assert.match(body, /referral-code-output/i);
  });
});

test('runtime serves the standalone App route', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/App/`, { signal: AbortSignal.timeout(3000) });
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /data-app-root/i);
    assert.match(body, /Zwibba/i);
  });
});

test('runtime serves the lowercase app route', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app`, {
      signal: AbortSignal.timeout(3000),
    });
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /data-app-root/i);
    assert.match(body, /Zwibba/i);
    assert.equal(response.headers.get('x-zwibba-canonical-route'), '/App/');
  });
});

test('runtime serves App module assets with a JavaScript MIME type', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/assets/app/services/draft-storage.mjs`, {
      signal: AbortSignal.timeout(3000),
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /application\/javascript/i);
    assert.match(response.headers.get('cache-control') || '', /no-cache/i);
  });
});

test('build can inject Plausible analytics when configured', () => {
  buildSite({
    PLAUSIBLE_DOMAIN: 'zwibba.com',
    PLAUSIBLE_SRC: 'https://plausible.io/js/script.js',
  });

  const landing = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.match(landing, /plausible\.io\/js\/script\.js/i);
  assert.match(landing, /data-domain="zwibba\.com"/i);
});
