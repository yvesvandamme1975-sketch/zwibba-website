import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function buildSite() {
  execFileSync('node', ['scripts/build.mjs'], {
    cwd: repoRoot,
    stdio: 'pipe',
  });
}

async function withServer(run, env = {}) {
  buildSite();

  const port = 4317;
  const server = spawn('node', ['server.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, ...env, PORT: String(port) },
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

async function withMockApi(handler, run) {
  const mockApi = createServer(handler);
  await new Promise((resolve) => {
    mockApi.listen(0, '127.0.0.1', resolve);
  });

  try {
    const { port } = mockApi.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      mockApi.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

function listing({ slug, title, countryCode = 'BE', categoryId = 'vehicles' }) {
  return {
    slug,
    title,
    categoryId,
    categoryLabel: 'Véhicules',
    locationLabel: countryCode === 'BE' ? 'Bruxelles' : 'Lubumbashi',
    priceAmount: countryCode === 'BE' ? 950 : 450000,
    priceCurrency: countryCode === 'BE' ? 'EUR' : 'CDF',
    primaryImageUrl: `https://cdn.test/${slug}.jpg`,
  };
}

test('server injects live listings into browse pages with empty, fallback and cache paths', async () => {
  const requestedCountries = [];
  let requestCount = 0;
  await withMockApi((request, response) => {
    requestCount += 1;
    const url = new URL(request.url || '/', 'http://api.test');
    requestedCountries.push(url.searchParams.get('countryCode'));
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        items:
          url.searchParams.get('countryCode') === 'BE'
            ? [listing({ slug: 'velo-live-bruxelles', title: 'Vélo live Bruxelles' })]
            : [listing({ slug: 'moto-live-lubumbashi', title: 'Moto live Lubumbashi', countryCode: 'CD' })],
      }),
    );
  }, async (mockBase) => {
    await withServer(async (baseUrl) => {
      const frBeResponse = await fetch(`${baseUrl}/be/annonces/`, { signal: AbortSignal.timeout(3000) });
      const frBe = await frBeResponse.text();
      assert.equal(frBeResponse.status, 200);
      assert.match(frBe, /Vélo live Bruxelles/);
      assert.doesNotMatch(frBe, /data-live-listings-empty-state/);
      assert.match(
        frBe,
        /<div class="listing-grid" id="browse-results-grid">[\s\S]*Vélo live Bruxelles[\s\S]*<\/div>\s*<template data-live-listings-empty>/,
      );

      const nlBeResponse = await fetch(`${baseUrl}/be/nl/annonces/`, { signal: AbortSignal.timeout(3000) });
      const nlBe = await nlBeResponse.text();
      assert.equal(nlBeResponse.status, 200);
      assert.match(nlBe, /Vélo live Bruxelles/);
      assert.match(nlBe, /Voertuigen/);

      const cdResponse = await fetch(`${baseUrl}/annonces/`, { signal: AbortSignal.timeout(3000) });
      const cd = await cdResponse.text();
      assert.equal(cdResponse.status, 200);
      assert.match(cd, /Moto live Lubumbashi/);
      assert.doesNotMatch(cd, /Samsung Galaxy A54 neuf sous emballage/);

      assert.deepEqual(requestedCountries.slice(0, 2), ['BE', 'CD']);

      const countBeforeCacheHit = requestCount;
      const cachedResponse = await fetch(`${baseUrl}/be/annonces/`, { signal: AbortSignal.timeout(3000) });
      assert.equal(cachedResponse.status, 200);
      assert.equal(requestCount, countBeforeCacheHit);
    }, { ZWIBBA_API_BASE_URL: mockBase });
  });

  await withMockApi((_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ items: [] }));
  }, async (mockBase) => {
    await withServer(async (baseUrl) => {
      const cd = await (await fetch(`${baseUrl}/annonces/`, { signal: AbortSignal.timeout(3000) })).text();
      const frBe = await (await fetch(`${baseUrl}/be/annonces/`, { signal: AbortSignal.timeout(3000) })).text();
      assert.match(cd, /Aucune annonce disponible pour le moment\./);
      assert.doesNotMatch(cd, /Samsung Galaxy A54 neuf sous emballage/);
      assert.match(frBe, /Soyez le premier à publier en Belgique\./);
    }, { ZWIBBA_API_BASE_URL: mockBase });
  });

  await withMockApi((_request, response) => {
    response.writeHead(500, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: 'boom' }));
  }, async (mockBase) => {
    await withServer(async (baseUrl) => {
      const cd = await (await fetch(`${baseUrl}/annonces/`, { signal: AbortSignal.timeout(3000) })).text();
      const frBe = await (await fetch(`${baseUrl}/be/annonces/`, { signal: AbortSignal.timeout(3000) })).text();
      assert.match(cd, /Samsung Galaxy A54 neuf sous emballage/);
      assert.match(frBe, /data-live-listings-empty-state/);
      assert.match(frBe, /Soyez le premier à publier en Belgique\./);
    }, { ZWIBBA_API_BASE_URL: mockBase });
  });
});
