import assert from 'node:assert/strict';
import test from 'node:test';

import { FallbackVisionDraftProvider } from '../../src/ai/fallback-vision-draft-provider';

const sampleRequest = {
  photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
};

test('fallback provider returns the first successful result in priority order', async () => {
  const calls: string[] = [];
  const provider = new FallbackVisionDraftProvider([
    {
      async generateDraftFromImage() {
        calls.push('gemini');
        throw new Error('gemini unavailable');
      },
    },
    {
      async generateDraftFromImage() {
        calls.push('anthropic');
        return {
          categoryId: 'phones_tablets',
          condition: 'like_new',
          description: 'Téléphone propre.',
          title: 'Samsung Galaxy A54',
        };
      },
    },
    {
      async generateDraftFromImage() {
        calls.push('mistral');
        throw new Error('should not be called');
      },
    },
  ]);

  const result = await provider.generateDraftFromImage(sampleRequest);

  assert.deepEqual(calls, ['gemini', 'anthropic']);
  assert.equal(result.title, 'Samsung Galaxy A54');
});

test('fallback provider throws only after every provider fails', async () => {
  const provider = new FallbackVisionDraftProvider([
    {
      async generateDraftFromImage() {
        throw new Error('gemini unavailable');
      },
    },
    {
      async generateDraftFromImage() {
        throw new Error('anthropic unavailable');
      },
    },
    {
      async generateDraftFromImage() {
        throw new Error('mistral unavailable');
      },
    },
  ]);

  await assert.rejects(
    () => provider.generateDraftFromImage(sampleRequest),
    /mistral unavailable/,
  );
});
