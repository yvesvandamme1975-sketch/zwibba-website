import { listingLifecycleStatuses } from '../src/listings/listing-lifecycle';
import { hasCurrentLinkImage, isPubliclyVisibleForLinkImage, type LinkImageRegeneration } from '../src/share/story-image.service';

/**
 * Bounded backfill of the branded link preview (`share-v2-<hash>.jpg`).
 *
 * Only listings that are publicly visible today (approved, lifecycle active,
 * not deleted by the seller) and do not yet serve the current design are
 * candidates; sold, paused or deleted listings are never touched nor
 * reactivated. Regeneration goes through `StoryImageService.generateLinkImageForListing`,
 * which never touches `story.png`, writes a content-addressed object and
 * compare-and-sets the database row. Every applied change is recorded in a
 * manifest with the previous URL so it can be rolled back conditionally.
 */

export interface BackfillListing {
  id: string;
  slug: string;
  moderationStatus: string;
  lifecycleStatus?: string | null;
  deletedBySellerAt?: Date | null;
  shareImageUrl: string | null;
  storyImageUrl: string | null;
  updatedAt: Date;
}

export interface BackfillManifestEntry {
  id: string;
  slug: string;
  previousShareImageUrl: string | null;
  shareImageUrl: string;
  storyImageUrl: string | null;
  updatedAt: string;
  bytes: number;
}

export interface BackfillManifest {
  version: 1;
  createdAt: string;
  /** Listings the run intends to touch, written before the first write. */
  planned: Array<{ id: string; slug: string; previousShareImageUrl: string | null }>;
  entries: BackfillManifestEntry[];
  failed: Array<{ id: string; slug: string; reason: string }>;
}

export interface BackfillPlan {
  scanned: number;
  eligible: BackfillListing[];
  planned: BackfillListing[];
  remaining: number;
  skipped: { notPublic: string[]; current: string[] };
}

export interface BackfillResult {
  mode: 'dry-run' | 'apply';
  limit: number;
  scanned: number;
  planned: Array<Pick<BackfillListing, 'id' | 'slug' | 'shareImageUrl' | 'storyImageUrl'>>;
  remaining: number;
  skipped: BackfillPlan['skipped'];
  applied: BackfillManifestEntry[];
  failed: Array<{ id: string; slug: string; reason: string }>;
  manifest: BackfillManifest;
}

interface PrismaLike {
  listing: {
    findMany: (args?: unknown) => Promise<any[]>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
  };
}

interface ServiceLike {
  generateLinkImageForListing: (listingId: string) => Promise<LinkImageRegeneration>;
}

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 200;

export function selectLinkImageCandidates(listings: BackfillListing[], options: { limit: number }): BackfillPlan {
  const limit = Math.max(0, Math.min(MAX_LIMIT, Math.floor(options.limit)));
  const skipped = { notPublic: [] as string[], current: [] as string[] };
  const eligible: BackfillListing[] = [];
  for (const listing of listings) {
    if (!isPubliclyVisibleForLinkImage(listing)) {
      skipped.notPublic.push(listing.id);
      continue;
    }
    if (hasCurrentLinkImage(listing.shareImageUrl)) {
      skipped.current.push(listing.id);
      continue;
    }
    eligible.push(listing);
  }
  const planned = eligible.slice(0, limit);
  return { scanned: listings.length, eligible, planned, remaining: eligible.length - planned.length, skipped };
}

export async function loadBackfillListings(prisma: PrismaLike): Promise<BackfillListing[]> {
  const rows = await prisma.listing.findMany({
    where: { moderationStatus: 'approved', lifecycleStatus: listingLifecycleStatuses.active, deletedBySellerAt: null },
    select: { id: true, slug: true, moderationStatus: true, lifecycleStatus: true, deletedBySellerAt: true, shareImageUrl: true, storyImageUrl: true, updatedAt: true },
    orderBy: { updatedAt: 'asc' },
  });
  return rows as BackfillListing[];
}

export async function runLinkImageBackfill(
  prisma: PrismaLike,
  service: ServiceLike,
  options: {
    apply: boolean;
    limit?: number;
    now?: Date;
    listings?: BackfillListing[];
    /** Durable write-ahead of the manifest: called before the first write, then after every result. */
    persist?: (manifest: BackfillManifest) => Promise<void>;
  },
): Promise<BackfillResult> {
  const now = options.now ?? new Date();
  const limit = options.limit ?? DEFAULT_LIMIT;
  const listings = options.listings ?? (await loadBackfillListings(prisma));
  const plan = selectLinkImageCandidates(listings, { limit });
  const manifest: BackfillManifest = {
    version: 1,
    createdAt: now.toISOString(),
    planned: plan.planned.map(({ id, slug, shareImageUrl }) => ({ id, slug, previousShareImageUrl: shareImageUrl })),
    entries: [],
    failed: [],
  };
  const persist = options.persist ?? (async () => {});

  if (options.apply) {
    // The intent is durable before any effect, so an interrupted run still
    // leaves a manifest naming what it was about to touch.
    await persist(manifest);
    // Sequential on purpose: one photo download + sharp composition at a time,
    // and a failure never blocks the remaining listings.
    for (const listing of plan.planned) {
      try {
        const done = await service.generateLinkImageForListing(listing.id);
        manifest.entries.push({
          id: done.id,
          slug: listing.slug,
          previousShareImageUrl: done.previousShareImageUrl,
          shareImageUrl: done.shareImageUrl,
          storyImageUrl: done.storyImageUrl,
          updatedAt: done.updatedAt.toISOString(),
          bytes: done.bytes,
        });
      } catch (error) {
        manifest.failed.push({ id: listing.id, slug: listing.slug, reason: error instanceof Error ? error.message : String(error) });
      }
      await persist(manifest);
    }
  }

  return {
    mode: options.apply ? 'apply' : 'dry-run',
    limit,
    scanned: plan.scanned,
    planned: plan.planned.map(({ id, slug, shareImageUrl, storyImageUrl }) => ({ id, slug, shareImageUrl, storyImageUrl })),
    remaining: plan.remaining,
    skipped: plan.skipped,
    applied: manifest.entries,
    failed: manifest.failed,
    manifest,
  };
}

/**
 * Conditional rollback: an entry is restored only if the database still
 * references exactly what the backfill wrote (URL and preserved updatedAt).
 * Objects in R2 are left in place; they are content-addressed and harmless.
 */
export async function rollbackLinkImageBackfill(prisma: PrismaLike, manifest: BackfillManifest): Promise<{ restored: string[]; skipped: string[] }> {
  const restored: string[] = [];
  const skipped: string[] = [];
  for (const entry of manifest.entries) {
    const updatedAt = new Date(entry.updatedAt);
    const written = await prisma.listing.updateMany({
      where: { id: entry.id, shareImageUrl: entry.shareImageUrl, updatedAt },
      data: { shareImageUrl: entry.previousShareImageUrl, updatedAt },
    });
    (written.count === 1 ? restored : skipped).push(entry.id);
  }
  return { restored, skipped };
}
