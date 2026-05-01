import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import type { ListingPriceCurrency } from '../common/price-validation';
import { PrismaService } from '../database/prisma.service';
import {
  applyLifecycleAction as applySellerLifecycleAction,
  buildDeleteReasonLabel,
  buildLifecycleStatusLabel,
  buildSoldChannelLabel,
  listingLifecycleStatuses,
  resolveLifecycleCapabilities,
  resolveLifecycleStatus,
  resolveRestoreUntil,
} from './listing-lifecycle';

type PersistedListingRecord = {
  area: string;
  categoryId: string;
  deletedBySellerAt?: Date | null;
  deletedReason?: string | null;
  description: string;
  draftId: string;
  id: string;
  lifecycleStatus?: string | null;
  moderationStatus: string;
  ownerPhoneNumber: string;
  pausedAt?: Date | null;
  priceAmount: number;
  previousLifecycleStatusBeforeDelete?: string | null;
  priceCdf: number;
  priceCurrency?: string | null;
  slug: string;
  soldAt?: Date | null;
  soldChannel?: string | null;
  sourceType?: string | null;
  title: string;
  updatedAt?: Date;
};

type PersistedDraftPhotoRecord = {
  createdAt?: Date;
  id?: string;
  objectKey?: string;
  publicUrl: string;
  sourcePresetId?: string;
  uploadStatus: string;
};

type PersistedDraftRecord = {
  area: string;
  categoryId: string;
  condition: string;
  description: string;
  id: string;
  ownerPhoneNumber: string;
  photos: PersistedDraftPhotoRecord[];
  priceAmount: number;
  priceCdf: number;
  priceCurrency?: string | null;
  title: string;
};

const categoryLabels: Record<string, string> = {
  agriculture: 'Agriculture',
  beauty: 'Beauté',
  construction: 'Bricolage / Construction',
  education: 'École / Université',
  emploi: 'Emplois',
  electronics: 'Électronique',
  fashion: 'Mode',
  food: 'Alimentation',
  health: 'Santé',
  home_garden: 'Maison',
  music: 'Musique',
  phones_tablets: 'Téléphones & Tablettes',
  real_estate: 'Immobilier',
  services: 'Services',
  sports_leisure: 'Sports et loisirs',
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
    case 'agriculture':
      return [
        'Inspectez l’état du matériel avant de payer.',
        'Confirmez la capacité ou la compatibilité sur place.',
      ];
    case 'construction':
      return [
        'Vérifiez la quantité et l’état avant de payer.',
        'Inspectez les outils ou matériaux sur place.',
      ];
    case 'education':
      return [
        'Vérifiez le lot complet avant de payer.',
        'Confirmez le niveau ou l’édition avant achat.',
      ];
    case 'food':
      return [
        'Vérifiez la fraîcheur ou la date avant de payer.',
        'Privilégiez une remise rapide pour les produits périssables.',
      ];
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
    case 'sports_leisure':
      return [
        'Testez l’équipement si possible avant de payer.',
        'Inspectez l’usure avant de conclure l’achat.',
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

function buildLifecyclePayload(
  listing: PersistedListingRecord,
  now: Date = new Date(),
) {
  const lifecycleStatus = resolveLifecycleStatus(listing);
  const restoreUntil = resolveRestoreUntil(listing.deletedBySellerAt);
  const capabilities = resolveLifecycleCapabilities({
    deletedBySellerAt: listing.deletedBySellerAt,
    lifecycleStatus,
    moderationStatus: listing.moderationStatus,
    now,
  });

  return {
    canDelete: capabilities.canDelete,
    canMarkSold: capabilities.canMarkSold,
    canPause: capabilities.canPause,
    canRelist: capabilities.canRelist,
    canResume: capabilities.canResume,
    canRestore: capabilities.canRestore,
    deletedReason: buildDeleteReasonLabel(listing.deletedReason),
    lifecycleStatus,
    lifecycleStatusLabel: buildLifecycleStatusLabel(lifecycleStatus),
    restoreUntil: restoreUntil?.toISOString() ?? null,
    soldChannel: buildSoldChannelLabel(listing.soldChannel),
  };
}

function isPubliclyVisibleListing(listing: PersistedListingRecord) {
  return (
    listing.moderationStatus === 'approved' &&
    resolveLifecycleStatus(listing) === listingLifecycleStatuses.active
  );
}

function resolveListingPrice(listing: PersistedListingRecord) {
  return {
    priceAmount: listing.priceAmount ?? listing.priceCdf,
    priceCdf: listing.priceCdf,
    priceCurrency: (listing.priceCurrency ?? 'CDF') as ListingPriceCurrency,
  };
}

function toListingSummary(
  listing: PersistedListingRecord,
  primaryImageUrl: string | null,
) {
  const price = resolveListingPrice(listing);

  return {
    categoryId: listing.categoryId,
    categoryLabel: getCategoryLabel(listing.categoryId),
    id: listing.id,
    locationLabel: listing.area,
    priceAmount: price.priceAmount,
    priceCdf: price.priceCdf,
    priceCurrency: price.priceCurrency,
    primaryImageUrl,
    slug: listing.slug,
    title: listing.title,
  };
}

function toListingDetail({
  editDraft = null,
  images,
  listing,
  primaryImageUrl,
  viewerRole,
}: {
  editDraft?: PersistedDraftRecord | null;
  images: string[];
  listing: PersistedListingRecord;
  primaryImageUrl: string | null;
  viewerRole: 'buyer' | 'owner';
}) {
  const price = resolveListingPrice(listing);

  return {
    categoryId: listing.categoryId,
    categoryLabel: getCategoryLabel(listing.categoryId),
    contactActions: viewerRole === 'owner' ? [] : ['message', 'call'],
    contactPhoneNumber:
      viewerRole === 'owner' ? '' : listing.ownerPhoneNumber,
    editDraft:
      viewerRole === 'owner' && editDraft
        ? {
            area: editDraft.area,
            categoryId: editDraft.categoryId,
            condition: editDraft.condition,
            description: editDraft.description,
            draftId: editDraft.id,
            ownerPhoneNumber: editDraft.ownerPhoneNumber,
            photos: editDraft.photos.map((photo) => ({
              objectKey: photo.objectKey ?? '',
              photoId: photo.id ?? '',
              publicUrl: photo.publicUrl,
              sourcePresetId: photo.sourcePresetId ?? '',
              uploadStatus: photo.uploadStatus,
            })),
            priceAmount: editDraft.priceAmount ?? editDraft.priceCdf,
            priceCdf: editDraft.priceCdf,
            priceCurrency: (editDraft.priceCurrency ?? 'CDF') as ListingPriceCurrency,
            title: editDraft.title,
          }
        : null,
    id: listing.id,
    images,
    locationLabel: listing.area,
    priceAmount: price.priceAmount,
    priceCdf: price.priceCdf,
    priceCurrency: price.priceCurrency,
    primaryImageUrl,
    safetyTips: buildSafetyTips(listing.categoryId),
    seller: buildSellerProfile({
      categoryId: listing.categoryId,
      ownerPhoneNumber: listing.ownerPhoneNumber,
    }),
    slug: listing.slug,
    summary: listing.description,
    title: listing.title,
    viewerRole,
    ...buildLifecyclePayload(listing),
  };
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

  private async resolveListingDraft(listing: PersistedListingRecord) {
    const draft = await this.prismaService.draft.findUnique({
      include: {
        photos: true,
      },
      where: {
        id: listing.draftId,
      },
    });

    if (!draft) {
      return null;
    }

    return draft as PersistedDraftRecord;
  }

  async listBrowseFeed() {
    const listings = await this.prismaService.listing.findMany({
      where: {
        moderationStatus: 'approved',
      },
    });

    const visibleListings = (listings as PersistedListingRecord[])
      .filter(isPubliclyVisibleListing)
      .sort((left, right) => {
        const leftTime = left.updatedAt instanceof Date
          ? left.updatedAt.getTime()
          : 0;
        const rightTime = right.updatedAt instanceof Date
          ? right.updatedAt.getTime()
          : 0;

        return rightTime - leftTime;
      });

    const listingsWithImages = await Promise.all(
      visibleListings.map(async (listing) => ({
        images: await this.resolveListingImages(listing),
        listing,
      })),
    );

    return {
      items: listingsWithImages.map(({ listing, images }) =>
        toListingSummary(listing, images[0] ?? null),
      ),
    };
  }

  async getListingDetail(slug: string, session?: SessionRecord) {
    const listing = await this.prismaService.listing.findUnique({
      where: {
        slug,
      },
    });

    if (!listing) {
      throw new NotFoundException('Annonce introuvable.');
    }

    const persistedListing = listing as PersistedListingRecord;
    const viewerRole =
      session?.phoneNumber === persistedListing.ownerPhoneNumber ? 'owner' : 'buyer';

    if (viewerRole !== 'owner' && !isPubliclyVisibleListing(persistedListing)) {
      throw new NotFoundException('Annonce introuvable.');
    }

    const [draft, images] = await Promise.all([
      viewerRole === 'owner' ? this.resolveListingDraft(persistedListing) : Promise.resolve(null),
      this.resolveListingImages(persistedListing),
    ]);

    return toListingDetail({
      editDraft: draft,
      images,
      listing: persistedListing,
      primaryImageUrl: images[0] ?? null,
      viewerRole,
    });
  }

  async listSellerListings(session: SessionRecord) {
    const listings = await this.prismaService.listing.findMany({
      where: {
        ownerPhoneNumber: session.phoneNumber,
      },
    });

    const sortedListings = [...(listings as PersistedListingRecord[])].sort((left, right) => {
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
        const [primaryImageUrl, moderationDecision] = await Promise.all([
          this.resolveListingImages(listing).then((images) => images[0] ?? null),
          this.prismaService.moderationDecision.findUnique({
            where: {
              listingId: listing.id,
            },
          }),
        ]);

        return {
          id: listing.id,
          moderationStatus: listing.moderationStatus,
          ...resolveListingPrice(listing),
          primaryImageUrl,
          reasonSummary:
            moderationDecision?.reasonSummary ??
            buildListingStatusLabel(listing.moderationStatus),
          slug: listing.slug,
          statusLabel: buildListingStatusLabel(listing.moderationStatus),
          title: listing.title,
          ...buildLifecyclePayload(listing),
        };
      }),
    );

    return {
      items,
    };
  }

  async applyLifecycleAction({
    action,
    listingId,
    reasonCode,
    session,
  }: {
    action: string;
    listingId: string;
    reasonCode?: string;
    session: SessionRecord;
  }) {
    const listing = await this.prismaService.listing.findUnique({
      where: {
        id: listingId,
      },
    });

    if (!listing || (listing as PersistedListingRecord).ownerPhoneNumber !== session.phoneNumber) {
      throw new NotFoundException('Annonce introuvable.');
    }

    const persistedListing = listing as PersistedListingRecord;
    const now = new Date();
    const { event, updates } = applySellerLifecycleAction({
      action,
      currentListing: persistedListing,
      now,
      ownerPhoneNumber: session.phoneNumber,
      reasonCode,
    });

    const updatedListing = await this.prismaService.$transaction(async (transaction) => {
      const nextListing = await transaction.listing.update({
        data: updates,
        where: {
          id: listingId,
        },
      });

      await transaction.listingLifecycleEvent.create({
        data: {
          ...event,
          listingId,
        },
      });

      return nextListing as PersistedListingRecord;
    });

    return {
      id: updatedListing.id,
      moderationStatus: updatedListing.moderationStatus,
      slug: updatedListing.slug,
      title: updatedListing.title,
      ...buildLifecyclePayload(updatedListing, now),
    };
  }
}
