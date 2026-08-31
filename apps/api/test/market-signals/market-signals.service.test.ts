import assert from 'node:assert/strict';
import test from 'node:test';

import { PrismaService } from '../../src/database/prisma.service';
import { MarketSignalsService } from '../../src/market-signals/market-signals.service';

function createService(
  create: (input: { data: Record<string, unknown> }) => Promise<unknown>,
) {
  const prismaService = {
    searchQueryEvent: { create },
  } as unknown as PrismaService;

  return new MarketSignalsService(prismaService);
}

test('records one valid search query event', async () => {
  const calls: Array<{ data: Record<string, unknown> }> = [];
  const service = createService(async (input) => {
    calls.push(input);
    return input.data;
  });

  await service.recordSearchQuery({
    countryCode: 'CD',
    rawQuery: 'Ciment SIMBA',
    resultCount: 2,
    selectedCategoryId: 'construction',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.data.rawQuery, 'Ciment SIMBA');
  assert.equal(calls[0]?.data.normalizedQuery, 'ciment simba');
});

test('does not record a whitespace-only search query', async () => {
  const calls: Array<{ data: Record<string, unknown> }> = [];
  const service = createService(async (input) => {
    calls.push(input);
    return input.data;
  });

  await service.recordSearchQuery({
    countryCode: 'CD',
    rawQuery: '   ',
    resultCount: 2,
    selectedCategoryId: '',
  });

  assert.equal(calls.length, 0);
});

test('records a search query with zero results', async () => {
  const calls: Array<{ data: Record<string, unknown> }> = [];
  const service = createService(async (input) => {
    calls.push(input);
    return input.data;
  });

  await service.recordSearchQuery({
    countryCode: 'BE',
    rawQuery: 'introuvable',
    resultCount: 0,
    selectedCategoryId: '',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.data.resultCount, 0);
});

test('does not propagate a search query persistence failure', async () => {
  const service = createService(async () => {
    throw new Error('database unavailable');
  });

  await assert.doesNotReject(() =>
    service.recordSearchQuery({
      countryCode: 'CD',
      rawQuery: 'ciment',
      resultCount: 1,
      selectedCategoryId: '',
    }),
  );
});
