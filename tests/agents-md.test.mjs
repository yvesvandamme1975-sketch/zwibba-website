import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const agentsMdPath = fileURLToPath(new URL('../AGENTS.md', import.meta.url));

async function readAgents() {
  return await readFile(agentsMdPath, 'utf8');
}

test('AGENTS.md exposes a UX/UI conventions section for App/', async () => {
  const content = await readAgents();
  assert.match(content, /^##\s+UX\/UI conventions for App\/\s*$/m);
});

test('AGENTS.md UX/UI section references the canonical CSS variable usage', async () => {
  const content = await readAgents();
  assert.match(content, /var\(--green\)/);
});

test('AGENTS.md UX/UI section references the escaping helpers', async () => {
  const content = await readAgents();
  assert.match(content, /escapeHtml/);
});

test('AGENTS.md UX/UI section references the ARIA labelling convention', async () => {
  const content = await readAgents();
  assert.match(content, /aria-label/);
});

test('AGENTS.md UX/UI section calls out the mobile-first principle', async () => {
  const content = await readAgents();
  assert.match(content, /mobile-first/);
});

test('AGENTS.md rule 9 describes conditional auto-deploy', async () => {
  const content = await readAgents();
  assert.match(content, /conditional auto-deploy/i);
});

test('AGENTS.md rule 9 references the smoke marker convention', async () => {
  const content = await readAgents();
  assert.match(content, /smoke marker/i);
});

test('AGENTS.md rule 9 mentions railway redeploy for rollback', async () => {
  const content = await readAgents();
  assert.match(content, /railway redeploy/);
});

test('AGENTS.md rule 9 forbids pushing directly to the base branch', async () => {
  const content = await readAgents();
  assert.match(content, /Never push directly to/);
});
