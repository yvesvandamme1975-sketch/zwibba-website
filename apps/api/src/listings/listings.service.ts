import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';

type PersistedListingRecord = {
  area: string;
  categoryId: string;
  description: string;
  draftId: string;
  id: string;
  moderationStatus: string;
  ownerPhoneNumber: string;
  priceCdf: number;
  slug: string;
  title: string;
  updatedAt?: Date;
};

type PersistedDraftPhotoRecord = {
  createdAt?: Date;
  publicUrl: string;
  sourcePresetId?: string;
  uploadStatus: string;
};

const categoryLabels: Record<string, string> = {
  emploi: 'Emploi',
  electronics: 'Électronique',
  fashion: 'Mode',
  home_garden: 'Maison',
  phones_tablets: 'Téléphones & Tablettes',
  real_estate: 'Immobilier',
  services: 'Services',
  vehicles: 'Véhicules',
};

function getCategoryLabel(categoryId: string) {
  return categoryLabels[categoryId] ?? 'Annonces';
}

function buildSellerProfile({
  categoryId,
  ownerPhoneNumber,
}: {
  categoryId: string;
  ownerPhoneNumber: string;
}) {
  const lastDigits = ownerPhoneNumber.slice(-4);
  const isProfessional =
    categoryId === 'phones_tablets' || categoryId === 'vehicles';

  return {
    name: isProfessional ? `Vendeur ${lastDigits}` : `Particulier ${lastDigits}`,
    responseTime:
      categoryId === 'vehicles'
        ? 'Répond en moyenne en 22 min'
        : 'Répond en moyenne en 9 min',
    role: isProfessional ? 'Vendeur pro' : 'Particulier',
  };
}

function buildSafetyTips(categoryId: string) {
  switch (categoryId) {
    case 'vehicles':
      return [
        'Demandez les papiers du véhicule avant l’essai.',
        'Faites vérifier le véhicule avant paiement.',
      ];
    case 'real_estate':
      return [
        'Visitez le logement en journée.',
        'Confirmez les conditions de location sur place.',
      ];
    case 'phones_tablets':
      return [
        'Rencontrez le vendeur dans un lieu public.',
        'Vérifiez le produit avant de payer.',
      ];
    default:
      return [
        'Rencontrez le vendeur dans un lieu public.',
        'Évitez les paiements anticipés.',
      ];
  }
}

function getListingImageUrls(photos: PersistedDraftPhotoRecord[] = []) {
  return [...photos]
    .filter((photo) => photo.uploadStatus === 'uploaded' && photo.publicUrl)
    .sort((left, right) => {
      const leftRank = left.sourcePresetId === 'capture' ? 0 : 1;
      const rightRank = right.sourcePresetId === 'capture' ? 0 : 1;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      const leftTime = left.createdAt instanceof Date ? left.createdAt.getTime() : 0;
      const rightTime = right.createdAt instanceof Date ? right.createdAt.getTime() : 0;

      return leftTime - rightTime;
    })
    .map((photo) => photo.publicUrl);
}

function toListingSummary(
  listing: PersistedListingRecord,
  primaryImageUrl: string | null,
) {
  return {
    categoryId: listing.categoryId,
    categoryLabel: getCategoryLabel(listing.categoryId),
    id: listing.id,
    locationLabel: listing.area,
    priceCdf: listing.priceCdf,
    primaryImageUrl,
    slug: listing.slug,
    title: listing.title,
  };
}

function toListingDetail(
  listing: PersistedListingRecord,
  images: string[],
  primaryImageUrl: string | null,
) {
  return {
    categoryId: listing.categoryId,
    categoryLabel: getCategoryLabel(listing.categoryId),
    contactActions: ['message', 'call'],
    contactPhoneNumber: listing.ownerPhoneNumber,
    id: listing.id,
    images,
    locationLabel: listing.area,
    priceCdf: listing.priceCdf,
    primaryImageUrl,
    safetyTips: buildSafetyTips(listing.categoryId),
    seller: buildSellerProfile({
      categoryId: listing.categoryId,
      ownerPhoneNumber: listing.ownerPhoneNumber,
    }),
    slug: listing.slug,
    summary: listing.description,
    title: listing.title,
  };
}

function buildListingStatusLabel(status: string) {
  switch (status) {
    case 'approved':
      return 'Publiée';
    case 'pending_manual_review':
      return 'En revue';
    case 'blocked_needs_fix':
      return 'À corriger';
    default:
      return 'Brouillon';
  }
}

@Injectable()
export class ListingsService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
  ) {}

  private async resolveListingImages(listing: PersistedListingRecord) {
    const draft = await this.prismaService.draft.findUnique({
      include: {
        photos: true,
      },
      where: {
        id: listing.draftId,
      },
    });

    return getListingImageUrls(
      (draft?.photos ?? []) as PersistedDraftPhotoRecord[],
    );
  }

  async listBrowseFeed() {
    const listings = await this.prismaService.listing.findMany({
      where: {
        moderationStatus: 'approved',
      },
    });

    const sortedListings = [...listings].sort((left, right) => {
      const leftTime = left.updatedAt instanceof Date
        ? left.updatedAt.getTime()
        : 0;
      const rightTime = right.updatedAt instanceof Date
        ? right.updatedAt.getTime()
        : 0;

      return rightTime - leftTime;
    });

    const listingsWithImages = await Promise.all(
      sortedListings.map(async (listing) => ({
        images: await this.resolveListingImages(
          listing as PersistedListingRecord,
        ),
        listing: listing as PersistedListingRecord,
      })),
    );

    return {
      items: listingsWithImages.map(({ listing, images }) =>
        toListingSummary(listing, images[0] ?? null),
      ),
    };
  }

  async getListingDetail(slug: string) {
    const listing = await this.prismaService.listing.findUnique({
      where: {
        slug,
      },
    });

    if (!listing || listing.moderationStatus !== 'approved') {
      throw new NotFoundException('Annonce introuvable.');
    }

    const persistedListing = listing as PersistedListingRecord;
    const images = await this.resolveListingImages(persistedListing);

    return toListingDetail(persistedListing, images, images[0] ?? null);
  }

  async listSellerListings(session: SessionRecord) {
    const listings = await this.prismaService.listing.findMany({
      where: {
        ownerPhoneNumber: session.phoneNumber,
      },
    });
    const sortedListings = [...listings].sort((left, right) => {
      const leftTime = left.updatedAt instanceof Date
        ? left.updatedAt.getTime()
        : 0;
      const rightTime = right.updatedAt instanceof Date
        ? right.updatedAt.getTime()
        : 0;

      return rightTime - leftTime;
    });

    const items = await Promise.all(
      sortedListings.map(async (listing) => {
        const persistedListing = listing as PersistedListingRecord;
        const [primaryImageUrl, moderationDecision] = await Promise.all([
          this.resolveListingImages(persistedListing).then((images) => images[0] ?? null),
          this.prismaService.moderationDecision.findUnique({
            where: {
              listingId: persistedListing.id,
            },
          }),
        ]);

        return {
          id: persistedListing.id,
          moderationStatus: persistedListing.moderationStatus,
          priceCdf: persistedListing.priceCdf,
          primaryImageUrl,
          reasonSummary:
            moderationDecision?.reasonSummary ??
            buildListingStatusLabel(persistedListing.moderationStatus),
          slug: persistedListing.slug,
          statusLabel: buildListingStatusLabel(persistedListing.moderationStatus),
          title: persistedListing.title,
        };
      }),
    );

    return {
      items,
    };
  }
}
