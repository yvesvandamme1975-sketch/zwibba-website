import assert from 'node:assert/strict';
import test from 'node:test';

import { ModerationService } from '../../src/moderation/moderation.service';

async function flushMicrotasks() {
  await new Promise((resolve) => setImmediate(resolve));
}

function buildSyncedDraft(overrides: Record<string, unknown> = {}) {
  return {
    area: 'Kinshasa',
    attributesJson: {},
    categoryId: 'electronics',
    condition: 'good',
    description: 'Téléphone propre avec chargeur.',
    draftId: 'draft_phone_1',
    ownerPhoneNumber: '+243990000001',
    photos: [
      {
        objectKey: 'draft-photos/phone.jpg',
        photoId: 'photo_phone',
        publicUrl: 'https://cdn.zwibba.example/draft-photos/phone.jpg',
        sourcePresetId: 'phone-front',
        uploadStatus: 'uploaded',
      },
    ],
    priceAmount: 120,
    priceCdf: 336000,
    priceCurrency: 'USD',
    syncStatus: 'synced' as const,
    title: 'Samsung Galaxy A54',
    ...overrides,
  };
}

function buildPublishInput(overrides: Record<string, unknown> = {}) {
  return {
    categoryId: 'electronics',
    description: 'Téléphone propre avec chargeur.',
    draftId: 'draft_phone_1',
    ownerPhoneNumber: '+243990000001',
    priceAmount: 120,
    priceCurrency: 'USD',
    title: 'Samsung Galaxy A54',
    ...overrides,
  };
}

function buildPrismaService() {
  return {
    listing: {
      findUnique: async () => null,
    },
    $transaction: async (callback: (transaction: {
      listing: { upsert: (args: unknown) => Promise<{ id: string; slug: string }> };
      moderationDecision: { upsert: (args: unknown) => Promise<Record<string, never>> };
    }) => Promise<{ id: string; slug: string }>) => {
      return callback({
        listing: {
          upsert: async () => ({ id: 'l1', slug: 'x' }),
        },
        moderationDecision: {
          upsert: async () => ({}),
        },
      });
    },
  };
}

test('publish schedules story image generation fire-and-forget for an approved listing', async () => {
  const calls: string[] = [];
  const storyImageService = {
    generateAndStoreForListing: async (id: string) => {
      calls.push(id);
      return { storyImageUrl: 'u' };
    },
  };
  const draftsService = {
    getSyncedDraft: async () => buildSyncedDraft(),
  };
  const service = new ModerationService(
    draftsService as any,
    buildPrismaService() as any,
    storyImageService as any,
  );

  const result = await service.publish(buildPublishInput());

  assert.equal(result.status, 'approved');
  await flushMicrotasks();
  assert.deepEqual(calls, ['l1']);
});

test('publish does not generate a story image when the listing is not approved', async () => {
  const calls: string[] = [];
  const storyImageService = {
    generateAndStoreForListing: async (id: string) => {
      calls.push(id);
      return { storyImageUrl: 'u' };
    },
  };
  const draftsService = {
    getSyncedDraft: async () => buildSyncedDraft({ categoryId: 'real_estate' }),
  };
  const service = new ModerationService(
    draftsService as any,
    buildPrismaService() as any,
    storyImageService as any,
  );

  const result = await service.publish(buildPublishInput({ categoryId: 'real_estate' }));

  assert.equal(result.status, 'pending_manual_review');
  await flushMicrotasks();
  assert.deepEqual(calls, []);
});

test('publish returns ok even if story image generation throws', async () => {
  const storyImageService = {
    generateAndStoreForListing: async () => {
      throw new Error('R2 unreachable');
    },
  };
  const draftsService = {
    getSyncedDraft: async () => buildSyncedDraft(),
  };
  const service = new ModerationService(
    draftsService as any,
    buildPrismaService() as any,
    storyImageService as any,
  );

  await assert.doesNotReject(() => service.publish(buildPublishInput()));
  await flushMicrotasks();
});
