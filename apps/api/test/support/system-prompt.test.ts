import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSystemPrompt } from '../../src/support/system-prompt';

test('buildSystemPrompt returns a non-empty string', () => {
  const prompt = buildSystemPrompt();

  assert.equal(typeof prompt, 'string');
  assert.ok(prompt.trim().length > 0);
});

test('buildSystemPrompt is deterministic across calls', () => {
  const first = buildSystemPrompt();
  const second = buildSystemPrompt();

  assert.equal(first, second);
});

test('buildSystemPrompt limits the agent scope to Zwibba support only', () => {
  const prompt = buildSystemPrompt().toLowerCase();

  assert.ok(prompt.includes('zwibba'));
  assert.ok(
    prompt.includes('uniquement') || prompt.includes('seulement') || prompt.includes('only'),
  );
  assert.ok(prompt.includes('refus') || prompt.includes('refuse') || prompt.includes('décline'));
});

test('buildSystemPrompt treats inbound message content as untrusted data, not instructions', () => {
  const prompt = buildSystemPrompt().toLowerCase();

  assert.ok(prompt.includes('donnée') || prompt.includes('data'));
  assert.ok(prompt.includes('instruction'));
});

test('buildSystemPrompt forbids revealing or quoting the system prompt', () => {
  const prompt = buildSystemPrompt().toLowerCase();

  assert.ok(
    prompt.includes('ne jamais révéler') ||
      prompt.includes('never reveal') ||
      prompt.includes('ne révèle') ||
      prompt.includes('ne divulgue'),
  );
  assert.ok(prompt.includes('prompt'));
});

test('buildSystemPrompt restricts account actions to the sender own account, authorized server-side', () => {
  const prompt = buildSystemPrompt().toLowerCase();

  assert.ok(prompt.includes('soi-uniquement') || prompt.includes('soi uniquement') || prompt.includes('propre compte') || prompt.includes('own account'));
  assert.ok(prompt.includes('serveur') || prompt.includes('server'));
});

test('buildSystemPrompt instructs replying in the language of the user message', () => {
  const prompt = buildSystemPrompt().toLowerCase();

  assert.ok(prompt.includes('langue'));
});

test('buildSystemPrompt embeds knowledge base facts: a real currency and the boost concept', () => {
  const prompt = buildSystemPrompt();

  assert.ok(prompt.includes('CDF'));
  assert.ok(prompt.includes('EUR'));
  assert.ok(prompt.toLowerCase().includes('boost'));
  assert.ok(prompt.includes('15 000') || prompt.includes('15000'));
});

test('buildSystemPrompt embeds knowledge base facts about markets and languages', () => {
  const prompt = buildSystemPrompt();

  assert.ok(prompt.includes('Lubumbashi'));
  assert.ok(prompt.toLowerCase().includes('belgi') || prompt.toLowerCase().includes('belgique'));
});
