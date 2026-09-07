import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { R2StorageService } from '../media/r2-storage.service';
import { composeLinkImage, composeStoryImage } from './compose-story-image';

@Injectable()
export class StoryImageService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(R2StorageService) private readonly r2StorageService: R2StorageService,
    private readonly options: { fetchImpl?: typeof fetch } = {},
  ) {}

  async generateAndStoreForListing(listingId: string): Promise<{ storyImageUrl: string; shareImageUrl: string }> {
    const listing = await this.prismaService.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new Error(`Listing ${listingId} not found`);
    }

    const draft = await this.prismaService.draft.findUnique({
      where: { id: listing.draftId },
      include: { photos: true },
    });
    const primaryImageUrl = resolvePrimaryPhotoUrl(draft?.photos ?? []);
    if (!primaryImageUrl) {
      throw new Error(`No primary image for listing ${listingId}`);
    }

    const fetchImpl = this.options.fetchImpl ?? fetch;
    const photoResponse = await fetchImpl(primaryImageUrl, { signal: AbortSignal.timeout(15000) });
    if (!photoResponse.ok) throw new Error(`Photo download failed: ${photoResponse.status}`);
    const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());

    const imageInput = {
      photoBuffer,
      title: listing.title,
      zoneLabel: (listing as { zoneLabel?: string | null }).zoneLabel ?? listing.area ?? '',
      priceLabel: formatSharePrice(listing.priceAmount, listing.priceCurrency),
    };
    const pngBuffer = await composeStoryImage(imageInput);
    const landscapeBuffer = await composeLinkImage(imageInput);

    const objectKey = `listings/${listingId}/story.png`;
    const { publicUrl } = await this.r2StorageService.putBuffer({
      body: pngBuffer,
      contentType: 'image/png',
      objectKey,
    });
    const { publicUrl: shareImageUrl } = await this.r2StorageService.putBuffer({
      body: landscapeBuffer,
      contentType: 'image/png',
      objectKey: `listings/${listingId}/share.png`,
    });

    await this.prismaService.listing.update({
      where: { id: listingId },
      data: { storyImageUrl: publicUrl, shareImageUrl },
    });

    return { storyImageUrl: publicUrl, shareImageUrl };
  }
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
