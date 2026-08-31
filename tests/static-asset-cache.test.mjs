import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function withServer(run) {
  execFileSync('node', ['scripts/build.mjs'], { cwd: repoRoot, stdio: 'pipe' });

  const port = 4319;
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

// Les modules ES imbriqués de l'app sont importés sans `?v=` : ils doivent malgré
// tout être cachables, sinon chaque ouverture de l'app refait un aller-retour
// jusqu'à l'origine pour chacun des ~75 modules.
test('les modules imbriqués de l’app sont cachables', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/assets/app/services/api-config.mjs`);
    assert.equal(response.status, 200);

    const cacheControl = response.headers.get('cache-control');
    assert.doesNotMatch(
      cacheControl,
      /no-cache/,
      `les modules .mjs ne doivent pas être en no-cache (reçu: ${cacheControl})`,
    );
    assert.match(cacheControl, /max-age=\d+/, `en-tête inattendu: ${cacheControl}`);
  });
});

test('les pages HTML et les assets versionnés gardent leur politique de cache', async () => {
  await withServer(async (baseUrl) => {
    const page = await fetch(`${baseUrl}/`);
    assert.equal(page.status, 200);
    assert.match(
      page.headers.get('cache-control'),
      /no-cache/,
      'le HTML doit rester en no-cache pour que les déploiements soient visibles immédiatement',
    );

    const versioned = await fetch(`${baseUrl}/assets/app/app.js?v=1234567890`);
    assert.equal(versioned.status, 200);
    assert.match(
      versioned.headers.get('cache-control'),
      /immutable/,
      'un asset versionné doit rester immuable',
    );
  });
});
