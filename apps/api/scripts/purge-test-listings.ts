import { pathToFileURL } from 'node:url';

import { buildBelgianSeedDefinitions } from '../src/listings/belgian-seed-listings';
import { buildSystemSeedDefinitions } from '../src/listings/system-seeded-listings';

type ListingCandidate = {
  id?: string;
  slug?: string | null;
  title?: string | null;
  sellerPhone?: string | null;
  ownerPhoneNumber?: string | null;
  publishedAt?: Date | string | null;
  createdAt?: Date | string | null;
  lifecycleStatus?: string | null;
};

type PurgeCandidate = ListingCandidate & {
  id: string;
  slug: string;
  title: string;
  ownerPhoneNumber: string;
};

type PrismaLike = {
  listing: {
    findMany(args?: unknown): Promise<PurgeCandidate[]>;
    update(args: unknown): Promise<unknown>;
  };
};

const seedSlugs = new Set([
  ...buildBelgianSeedDefinitions().map((definition) => definition.listing.slug),
  ...buildSystemSeedDefinitions().map((definition) => definition.listing.slug),
]);

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function recordTime(record: ListingCandidate) {
  const value = record.publishedAt ?? record.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

export function isTestListing(record: ListingCandidate) {
  const slug = String(record.slug || '');
  const title = String(record.title || '');
  const sellerPhone = String(record.sellerPhone || record.ownerPhoneNumber || '');

  if (seedSlugs.has(slug)) {
    return false;
  }

  return (
    /^e2e-/i.test(slug) ||
    /zwibba-test/i.test(slug) ||
    /zwibba beta seller/i.test(title) ||
    /verification-live/i.test(slug) ||
    /^\+243990{5,}/.test(sellerPhone)
  );
}

function dedupeGalaxyA54(listings: PurgeCandidate[]) {
  const groups = new Map<string, PurgeCandidate[]>();

  for (const listing of listings) {
    if (seedSlugs.has(listing.slug)) {
      continue;
    }

    if (!/samsung galaxy a54 128 go/i.test(normalizeText(listing.title))) {
      continue;
    }

    const key = `${normalizeText(listing.title)}::${listing.ownerPhoneNumber}`;
    const group = groups.get(key) ?? [];
    group.push(listing);
    groups.set(key, group);
  }

  return [...groups.values()].flatMap((group) => {
    if (group.length < 2) {
      return [];
    }

    return group
      .sort((left, right) => recordTime(right) - recordTime(left))
      .slice(1);
  });
}

function uniqueCandidates(candidates: PurgeCandidate[]) {
  const seen = new Set<string>();
  const unique: PurgeCandidate[] = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.id)) {
      continue;
    }

    seen.add(candidate.id);
    unique.push(candidate);
  }

  return unique;
}

export async function runPurgeOnce(prisma: PrismaLike, { apply = false } = {}) {
  const listings = await prisma.listing.findMany({
    where: {
      lifecycleStatus: { not: 'archived' },
      OR: [
        { slug: { startsWith: 'e2e-', mode: 'insensitive' } },
        { slug: { contains: 'zwibba-test', mode: 'insensitive' } },
        { slug: { contains: 'verification-live', mode: 'insensitive' } },
        { title: { contains: 'Zwibba beta seller', mode: 'insensitive' } },
        { title: { contains: 'Samsung Galaxy A54 128 Go', mode: 'insensitive' } },
        { ownerPhoneNumber: { startsWith: '+243990' } },
      ],
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  }) as PurgeCandidate[];

  const flagged = listings.filter(isTestListing);
  const duplicateGalaxy = dedupeGalaxyA54(listings);
  const candidates = uniqueCandidates([...flagged, ...duplicateGalaxy]);
  const applied: Array<{ id: string; slug: string }> = [];

  if (apply) {
    const now = new Date();

    for (const candidate of candidates) {
      await prisma.listing.update({
        where: { id: candidate.id },
        data: {
          deletedBySellerAt: now,
          deletedReason: 'prod_test_data_purge',
          lifecycleChangedAt: now,
          lifecycleStatus: 'archived',
          previousLifecycleStatusBeforeDelete: candidate.lifecycleStatus || 'active',
        },
      });
      applied.push({ id: candidate.id, slug: candidate.slug });
    }
  }

  return {
    mode: apply ? 'apply' : 'dry-run',
    scanned: listings.length,
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      slug: candidate.slug,
      title: candidate.title,
      ownerPhoneNumber: candidate.ownerPhoneNumber,
    })),
    applied,
  };
}

async function main() {
  const apply = process.argv.slice(2).includes('--apply');
  const { PrismaService } = await import('../src/database/prisma.service');
  const prisma = new PrismaService();

  try {
    const result = await runPurgeOnce(prisma as unknown as PrismaLike, { apply });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
