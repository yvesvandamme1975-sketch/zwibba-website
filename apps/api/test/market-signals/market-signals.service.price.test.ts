import assert from 'node:assert/strict';
import test from 'node:test';

import { PrismaService } from '../../src/database/prisma.service';
import { MarketSignalsService } from '../../src/market-signals/market-signals.service';

function createService(
  create: (input: { data: Record<string, unknown> }) => Promise<unknown>,
) {
  const prismaService = {
    listingPriceEvent: { create },
  } as unknown as PrismaService;

  return new MarketSignalsService(prismaService);
}

test('records the first price on a new draft', async () => {
  const calls: Array<{ data: Record<string, unknown> }> = [];
  const service = createService(async (input) => {
    calls.push(input);
    return input.data;
  });

  await service.recordListingPriceEvent({
    countryCode: 'CD',
    draftId: 'draft-1',
    listingId: null,
    previous: null,
    next: { amount: 450_000, currency: 'CDF' },
    source: 'draft_created',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.data.source, 'draft_created');
});

test('does not record an unchanged price', async () => {
  const calls: Array<{ data: Record<string, unknown> }> = [];
  const service = createService(async (input) => {
    calls.push(input);
    return input.data;
  });

  await service.recordListingPriceEvent({
    countryCode: 'CD',
    draftId: 'draft-1',
    listingId: null,
    previous: { amount: 450_000, currency: 'CDF' },
    next: { amount: 450_000, currency: 'CDF' },
    source: 'draft_sync',
  });

  assert.equal(calls.length, 0);
});

test('records both sides of a changed price', async () => {
  const calls: Array<{ data: Record<string, unknown> }> = [];
  const service = createService(async (input) => {
    calls.push(input);
    return input.data;
  });

  await service.recordListingPriceEvent({
    countryCode: 'BE',
    draftId: 'draft-1',
    listingId: 'listing-1',
    previous: { amount: 30, currency: 'EUR' },
    next: { amount: 25, currency: 'EUR' },
    source: 'draft_sync',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.data.previousAmount, 30);
  assert.equal(calls[0]?.data.nextAmount, 25);
});

test('does not propagate a price event persistence failure', async () => {
  const service = createService(async () => {
    throw new Error('database unavailable');
  });

  await assert.doesNotReject(() =>
    service.recordListingPriceEvent({
      countryCode: 'CD',
      draftId: 'draft-1',
      listingId: null,
      previous: null,
      next: { amount: 450_000, currency: 'CDF' },
      source: 'draft_created',
    }),
  );
});
