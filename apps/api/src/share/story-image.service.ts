import { createHash } from 'node:crypto';

import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { listingLifecycleStatuses, resolveLifecycleStatus } from '../listings/listing-lifecycle';
import { R2StorageService } from '../media/r2-storage.service';
import { composeLinkImage, composeStoryImage } from './compose-story-image';

@Injectable()
export class StoryImageService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(R2StorageService) private readonly r2StorageService: R2StorageService,
    private readonly options: { fetchImpl?: typeof fetch; appBaseUrl?: string } = {},
  ) {}

  private storyJobs = 0;

  async generateStoryForSlug(slug: string): Promise<Buffer> {
    if (this.storyJobs >= 2) throw new ServiceUnavailableException('Préparation occupée. Réessayez dans un instant.');
    this.storyJobs += 1;
    try {
      const { imageInput } = await this.loadComposeInput({ slug });
      return await composeStoryImage(imageInput);
    } finally {
      this.storyJobs -= 1;
    }
  }

  /**
   * Regenerates ONLY the link preview (`share-v4-portrait-<hash>.jpg`) of an approved
   * listing. `story.png` is neither rendered nor touched. The object key is
   * content-addressed, so no referenced object is ever overwritten, and the
   * database write is a compare-and-set on `updatedAt`, the previous
   * `shareImageUrl` and the approved status: a listing changed between the
   * read and the write is left untouched and reported. `updatedAt` is
   * preserved so the browse feed order does not change. Used by the bounded
   * backfill, whose manifest keeps `previousShareImageUrl` for rollback.
   */
  async generateLinkImageForListing(listingId: string): Promise<LinkImageRegeneration> {
    const { listing, imageInput } = await this.loadComposeInput({ id: listingId });
    const previousShareImageUrl = listing.shareImageUrl ?? null;
    const previewBuffer = await composeLinkImage(imageInput);
    // Content-addressed object: a concurrent regeneration can never overwrite
    // an object that the database already references.
    const shareImageUrl = await this.uploadLinkImage(listing.id, previewBuffer);

    // Compare-and-set on everything the backfill relies on. `updatedAt` alone is
    // not enough because other backfills preserve it on purpose.
    const written = await this.prismaService.listing.updateMany({
      where: {
        id: listing.id,
        updatedAt: listing.updatedAt,
        shareImageUrl: previousShareImageUrl,
        moderationStatus: 'approved',
        lifecycleStatus: listingLifecycleStatuses.active,
        deletedBySellerAt: null,
      },
      data: { shareImageUrl, updatedAt: listing.updatedAt },
    });
    if (written.count !== 1) {
      throw new Error(`listing_changed_concurrently: ${listing.id}`);
    }

    return {
      id: listing.id,
      previousShareImageUrl,
      shareImageUrl,
      storyImageUrl: listing.storyImageUrl ?? null,
      updatedAt: listing.updatedAt,
      bytes: previewBuffer.length,
    };
  }

  private async uploadLinkImage(listingId: string, previewBuffer: Buffer): Promise<string> {
    // Versioned, content-addressed key: Facebook and WhatsApp cache previews per
    // URL, so a new design must be served from a new address; and identical
    // bytes map to the same key, so concurrent writers never clobber each other.
    const { publicUrl } = await this.r2StorageService.putBuffer({
      body: previewBuffer,
      contentType: 'image/jpeg',
      objectKey: `listings/${listingId}/${linkImageFilename(previewBuffer)}`,
    });
    return publicUrl;
  }

  private async loadComposeInput(where: { id: string } | { slug: string }) {
    const listing = await this.prismaService.listing.findUnique({ where });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (!isPubliclyVisibleForLinkImage(listing)) throw new NotFoundException(`listing_not_public: ${listing.id}`);

    const draft = await this.prismaService.draft.findUnique({
      where: { id: listing.draftId },
      include: { photos: true },
    });
    const primaryImageUrl = resolvePrimaryPhotoUrl(draft?.photos ?? []);
    if (!primaryImageUrl) {
      throw new Error(`No primary image for listing ${listing.id}`);
    }

    const fetchImpl = this.options.fetchImpl ?? fetch;
    const photoUrl = resolvePhotoFetchUrl(primaryImageUrl, this.options.appBaseUrl);
    const source = new URL(photoUrl);
    const allowedOrigins = [process.env.R2_PUBLIC_BASE_URL, this.options.appBaseUrl || process.env.APP_BASE_URL || PUBLIC_APP_BASE_URL]
      .filter(Boolean).map((url) => new URL(url!).origin);
    if (source.protocol !== 'https:' || source.username || source.password || !allowedOrigins.includes(source.origin)) {
      throw new Error('photo_source_not_allowed');
    }
    const photoResponse = await fetchImpl(photoUrl, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!photoResponse.ok) throw new Error(`Photo download failed: ${photoResponse.status}`);
    if (!photoResponse.body) throw new Error('Photo download empty');
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of photoResponse.body) {
      size += chunk.length;
      if (size > 8_000_000) throw new Error('Photo download too large');
      chunks.push(chunk);
    }
    const photoBuffer = Buffer.concat(chunks);

    const imageInput = {
      photoBuffer,
      title: listing.title,
      zoneLabel: (listing as { zoneLabel?: string | null }).zoneLabel ?? listing.area ?? '',
      priceLabel: formatSharePrice(listing.priceAmount, listing.priceCurrency),
    };
    return { listing, imageInput };
  }
}

/** Design version of the branded link preview; bump when the design changes. */
export const LINK_IMAGE_VERSION = 'share-v4-portrait';
const LINK_IMAGE_FILENAME_PATTERN = new RegExp(`/${LINK_IMAGE_VERSION}-[a-f0-9]{16}\\.jpg$`);

/** Content-addressed file name: `share-v4-portrait-<sha256 prefix>.jpg`. */
export function linkImageFilename(bytes: Buffer): string {
  return `${LINK_IMAGE_VERSION}-${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}.jpg`;
}

export interface LinkImageRegeneration {
  id: string;
  previousShareImageUrl: string | null;
  shareImageUrl: string;
  storyImageUrl: string | null;
  updatedAt: Date;
  bytes: number;
}

/** Mirrors `isPubliclyVisibleListing` (approved + active) plus the seller-deletion mark. */
export function isPubliclyVisibleForLinkImage(listing: {
  moderationStatus?: string | null;
  lifecycleStatus?: string | null;
  deletedBySellerAt?: Date | null;
}): boolean {
  return (
    listing.moderationStatus === 'approved' &&
    resolveLifecycleStatus(listing) === listingLifecycleStatuses.active &&
    !listing.deletedBySellerAt
  );
}

/** True when a listing already serves the current branded link preview. */
export function hasCurrentLinkImage(shareImageUrl: string | null | undefined): boolean {
  return typeof shareImageUrl === 'string' && LINK_IMAGE_FILENAME_PATTERN.test(shareImageUrl);
}

const PUBLIC_APP_BASE_URL = 'https://zwibba.com';

/**
 * Seeded listings store their photo as a site-relative path (`/assets/listings/...jpg`),
 * which `fetch` rejects. Resolve those against the application origin; absolute R2 or CDN
 * URLs are returned untouched.
 */
export function resolvePhotoFetchUrl(publicUrl: string, appBaseUrl?: string): string {
  if (/^https?:\/\//i.test(publicUrl)) return publicUrl;
  const base = new URL(appBaseUrl || process.env.APP_BASE_URL || PUBLIC_APP_BASE_URL);
  return new URL(publicUrl, base.origin).toString();
}

export function formatSharePrice(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) return '';
  const resolved = currency ?? 'CDF';
  const formatted = new Intl.NumberFormat(resolved === 'EUR' ? 'fr-BE' : 'fr-CD').format(amount);
  return `${formatted} ${resolved === 'EUR' ? '€' : resolved === 'USD' ? 'US$' : resolved}`;
}

type DraftPhotoLike = {
  publicUrl: string;
  uploadStatus: string;
  sourcePresetId?: string;
  createdAt?: Date;
};

function resolvePrimaryPhotoUrl(photos: DraftPhotoLike[]): string | null {
  const sorted = [...photos]
    .filter((p) => p.uploadStatus === 'uploaded' && p.publicUrl)
    .sort((a, b) => {
      const ra = a.sourcePresetId === 'capture' ? 0 : 1;
      const rb = b.sourcePresetId === 'capture' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return ta - tb;
    });
  return sorted[0]?.publicUrl ?? null;
}
