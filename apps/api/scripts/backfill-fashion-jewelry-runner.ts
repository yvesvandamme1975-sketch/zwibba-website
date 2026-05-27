import { proposeJewelryBackfillForRecord } from '../src/common/jewelry-text-detection';

interface PrismaLike {
  listing: {
    findMany: (args?: unknown) => Promise<any[]>;
    update: (args: unknown) => Promise<any>;
  };
  draft: {
    findMany: (args?: unknown) => Promise<any[]>;
    update: (args: unknown) => Promise<any>;
  };
}

interface BackfillResult {
  scanned: { listings: number; drafts: number };
  candidates: Array<{
    table: 'listing' | 'draft';
    id: string;
    title: string;
    from: { itemType: string; size: string };
    to: { itemType: string; size: '' };
    evidence: string;
  }>;
  applied: BackfillResult['candidates'];
  aborted: boolean;
}

const MAX_RECORDS_PER_RUN = 500;

export async function runBackfillOnce(
  prisma: PrismaLike,
  options: { apply: boolean },
): Promise<BackfillResult> {
  const [listings, drafts] = await Promise.all([
    prisma.listing.findMany({ where: { categoryId: 'fashion' } }),
    prisma.draft.findMany({ where: { categoryId: 'fashion' } }),
  ]);

  const totalScanned = listings.length + drafts.length;
  if (totalScanned > MAX_RECORDS_PER_RUN) {
    return {
      scanned: { listings: listings.length, drafts: drafts.length },
      candidates: [],
      applied: [],
      aborted: true,
    };
  }

  const candidates: BackfillResult['candidates'] = [];

  for (const record of listings) {
    const proposal = proposeJewelryBackfillForRecord(record);
    if (proposal) {
      candidates.push({ table: 'listing', id: record.id, title: record.title, ...proposal });
    }
  }
  for (const record of drafts) {
    const proposal = proposeJewelryBackfillForRecord(record);
    if (proposal) {
      candidates.push({ table: 'draft', id: record.id, title: record.title, ...proposal });
    }
  }

  const applied: BackfillResult['candidates'] = [];
  if (options.apply) {
    for (const candidate of candidates) {
      const table = candidate.table === 'listing' ? prisma.listing : prisma.draft;
      await table.update({
        where: { id: candidate.id },
        data: {
          attributesJson: { fashion: { itemType: candidate.to.itemType, size: '' } },
        },
      });
      applied.push(candidate);
    }
  }

  return {
    scanned: { listings: listings.length, drafts: drafts.length },
    candidates,
    applied,
    aborted: false,
  };
}
