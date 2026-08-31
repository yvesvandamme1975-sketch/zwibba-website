import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
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

  const port = 4321;
  const server = spawn('node', ['server.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, ...env, PORT: String(port) },
    stdio: 'ignore',
  });

  try {
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`, {
          signal: AbortSignal.timeout(1000),
        });
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

test('legacy plural share links /annonces/<slug> redirect to the OG page /annonce/<slug>/', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/annonces/velo-cargo-bruxelles`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(3000),
    });

    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), '/annonce/velo-cargo-bruxelles/');
  });
});

test('the browse page /annonces/ itself is not redirected', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/annonces/`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(3000),
    });

    assert.equal(response.status, 200);
  });
});
