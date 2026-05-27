import assert from 'node:assert/strict';
import test from 'node:test';

import { ModerationService } from '../../src/moderation/moderation.service';

async function flushMicrotasks() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('approve schedules storyImageService.generateAndStoreForListing fire-and-forget', async () => {
  const calls: string[] = [];
  const mockStoryImageService = {
    generateAndStoreForListing: async (id: string) => {
      calls.push(id);
      return { storyImageUrl: 'https://r2/listings/' + id + '/story.png' };
    },
  };
  const mockPrismaService = {
    listing: {
      findUnique: async () => ({ id: 'l1', moderationStatus: 'pending' }),
      update: async () => ({}),
    },
    moderationDecision: { upsert: async () => ({}) },
  };

  const service = new ModerationService({} as any, mockPrismaService as any, mockStoryImageService as any);
  const result = await service.approve('l1');

  // approve must return immediately (no waiting on the story image)
  assert.equal(result.status, 'approved');
  // The story image call is enqueued but may not have resolved yet.
  await flushMicrotasks();
  assert.deepEqual(calls, ['l1']);
});

test('approve returns successfully even when storyImageService throws', async () => {
  const mockStoryImageService = {
    generateAndStoreForListing: async () => { throw new Error('R2 unreachable'); },
  };
  const mockPrismaService = {
    listing: {
      findUnique: async () => ({ id: 'l1', moderationStatus: 'pending' }),
      update: async () => ({}),
    },
    moderationDecision: { upsert: async () => ({}) },
  };

  const service = new ModerationService({} as any, mockPrismaService as any, mockStoryImageService as any);
  await assert.doesNotReject(() => service.approve('l1'));
  await flushMicrotasks();
  // No unhandled rejection should occur — the catch in the implementation must swallow the error.
});
