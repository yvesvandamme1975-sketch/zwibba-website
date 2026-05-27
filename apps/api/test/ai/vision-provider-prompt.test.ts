import assert from 'node:assert/strict';
import test from 'node:test';

import { buildVisionDraftPrompt } from '../../src/ai/vision-provider-prompt';

test('buildVisionDraftPrompt enumerates every fashion item type, including jewelry subtypes', () => {
  const prompt = buildVisionDraftPrompt();

  for (const itemType of [
    'shoes',
    'pants',
    'tops',
    'dress_skirt',
    'jacket_sweater',
    'jewelry_ring',
    'jewelry_earrings',
    'jewelry_necklace',
    'jewelry_bracelet',
    'jewelry_watch',
  ]) {
    assert.match(prompt, new RegExp(itemType), `prompt should mention ${itemType}`);
  }
});

test('buildVisionDraftPrompt instructs Gemini to use jewelry subtypes for jewelry items', () => {
  const prompt = buildVisionDraftPrompt();

  assert.match(prompt, /bijou|bague|boucles d'oreilles|collier|bracelet|montre/i);
  assert.match(prompt, /jewelry_ring/);
  assert.match(prompt, /size.*jewelry_ring|jewelry_ring.*size/i);
});
