import assert from 'node:assert/strict';
import test from 'node:test';

import { ModerationService } from '../../src/moderation/moderation.service';

async function flushMicrotasks() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('approve schedules storyImageService.generateLinkImageForListing fire-and-forget', async () => {
  const calls: string[] = [];
  const mockStoryImageService = {
    generateStoryForSlug: () => { assert.fail('story must wait for a sharing request'); },
    generateLinkImageForListing: async (id: string) => {
      calls.push(id);
      return { shareImageUrl: 'https://r2/listings/' + id + '/story.png' };
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
    generateStoryForSlug: () => { assert.fail('story must wait for a sharing request'); },
    generateLinkImageForListing: async () => { throw new Error('R2 unreachable'); },
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

test('legacy story regeneration cannot prepare an image ahead of sharing', async () => {
  const service=new ModerationService({} as any,{} as any,{} as any);
  await assert.rejects(()=>service.regenerateStory('l1'), (error:any)=>error.getStatus()===410);
});
