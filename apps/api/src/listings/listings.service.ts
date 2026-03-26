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
  publicUrl: string;
  uploadStatus: string;
};

const categoryLabels: Record<string, string> = {
  electronics: 'Électronique',
  phones_tablets: 'Téléphones & Tablettes',
  real_estate: 'Immobilier',
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

function getPrimaryImageUrl(photos: PersistedDraftPhotoRecord[] = []) {
  const uploadedPhoto = photos.find(
    (photo) => photo.uploadStatus === 'uploaded' && photo.publicUrl,
  );

  return uploadedPhoto?.publicUrl ?? null;
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
  primaryImageUrl: string | null,
) {
  return {
    categoryId: listing.categoryId,
    categoryLabel: getCategoryLabel(listing.categoryId),
    contactActions: ['message', 'call'],
    contactPhoneNumber: listing.ownerPhoneNumber,
    id: listing.id,
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

  private async resolvePrimaryImageUrl(listing: PersistedListingRecord) {
    const draft = await this.prismaService.draft.findUnique({
      include: {
        photos: true,
      },
      where: {
        id: listing.draftId,
      },
    });

    return getPrimaryImageUrl(
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
        listing: listing as PersistedListingRecord,
        primaryImageUrl: await this.resolvePrimaryImageUrl(
          listing as PersistedListingRecord,
        ),
      })),
    );

    return {
      items: listingsWithImages.map(({ listing, primaryImageUrl }) =>
        toListingSummary(listing, primaryImageUrl),
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
    const primaryImageUrl = await this.resolvePrimaryImageUrl(persistedListing);

    return toListingDetail(persistedListing, primaryImageUrl);
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
          this.resolvePrimaryImageUrl(persistedListing),
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
