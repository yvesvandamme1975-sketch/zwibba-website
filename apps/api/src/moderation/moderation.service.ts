import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  ListingPriceCurrency,
  resolveSubmittedListingPrice,
} from '../common/price-validation';
import { toPrismaListingAttributesJson } from '../common/listing-attributes';
import { PrismaService } from '../database/prisma.service';
import { DraftsService } from '../drafts/drafts.service';

export type ModerationStatus =
  | 'approved'
  | 'blocked_needs_fix'
  | 'pending_manual_review';

export type ModerationQueueItem = {
  id: string;
  listingTitle: string;
  reasonSummary: string;
  sellerPhoneNumber: string;
  status: ModerationStatus;
};

export type PublishOutcome = {
  id: string;
  listingSlug: string;
  reasonSummary: string;
  shareUrl: string;
  status: ModerationStatus;
  statusLabel: string;
};

const vehicleRequiredSourcePresetIds = [
  'avant',
  'arriere',
  'droite',
  'gauche',
  'interieur',
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

function buildStatusLabel(status: ModerationStatus) {
  switch (status) {
    case 'approved':
      return 'Annonce approuvée et prête à partager';
    case 'pending_manual_review':
      return 'Annonce envoyée en revue manuelle';
    case 'blocked_needs_fix':
      return 'Annonce bloquée: informations à corriger';
  }
}

function buildReasonSummary({
  status,
  validationError,
}: {
  status: ModerationStatus;
  validationError?: string;
}) {
  if (status === 'blocked_needs_fix') {
    return validationError ??
      'Les informations du produit doivent être complétées avant publication.';
  }

  if (status === 'pending_manual_review') {
    return 'Votre annonce a été envoyée en revue manuelle.';
  }

  return 'Annonce approuvée et prête à partager.';
}

function detectValidationError({
  categoryId,
  description,
  photos,
  priceAmount,
  title,
}: {
  categoryId: string;
  description: string;
  photos: Array<{ sourcePresetId?: string; uploadStatus: string }>;
  priceAmount: number;
  title: string;
}) {
  if (title.trim().length === 0) {
    return 'Le titre de l’annonce doit être complété avant publication.';
  }

  if (priceAmount <= 0) {
    return 'Le prix final doit être confirmé avant publication.';
  }

  if (description.trim().length === 0) {
    return 'La description du produit doit être complétée avant publication.';
  }

  if (
    photos.length === 0 ||
    !photos.some((photo) => photo.uploadStatus === 'uploaded')
  ) {
    return 'Ajoutez au moins une photo valide avant publication.';
  }

  if (categoryId === 'vehicles') {
    const uploadedVehiclePresetIds = new Set(
      photos
        .filter((photo) => photo.uploadStatus === 'uploaded')
        .map((photo) => photo.sourcePresetId ?? '')
        .filter(Boolean),
    );
    const missingVehiclePresetIds = vehicleRequiredSourcePresetIds.filter((presetId) => {
      return !uploadedVehiclePresetIds.has(presetId);
    });

    if (missingVehiclePresetIds.length) {
      return `Ajoutez ces vues avant publication : ${missingVehiclePresetIds.join(', ')}.`;
    }
  }

  return undefined;
}

function resolveModerationStatus({
  categoryId,
  validationError,
}: {
  categoryId: string;
  validationError?: string;
}): ModerationStatus {
  if (validationError) {
    return 'blocked_needs_fix';
  }

  if (categoryId === 'real_estate') {
    return 'pending_manual_review';
  }

  return 'approved';
}

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DraftsService) private readonly draftsService: DraftsService,
    @Inject(PrismaService) private readonly prismaService: PrismaService,
  ) {}

  private async resolveListingSlug({
    draftId,
    title,
  }: {
    draftId: string;
    title: string;
  }) {
    const existingListing = await this.prismaService.listing.findUnique({
      where: {
        draftId,
      },
    });

    if (existingListing) {
      return existingListing.slug;
    }

    const baseSlug = slugify(title) || `annonce-${draftId.slice(-8)}`;
    const conflictingListing = await this.prismaService.listing.findUnique({
      where: {
        slug: baseSlug,
      },
    });

    if (!conflictingListing) {
      return baseSlug;
    }

    return `${baseSlug}-${draftId.slice(-6).toLowerCase()}`;
  }

  async publish({
    categoryId,
    description,
    draftId,
    ownerPhoneNumber,
    priceAmount,
    priceCdf,
    priceCurrency,
    title,
  }: {
    categoryId: string;
    description: string;
    draftId: string;
    ownerPhoneNumber: string;
    priceAmount?: number;
    priceCdf?: number;
    priceCurrency?: string;
    title: string;
  }): Promise<PublishOutcome> {
    const supportedPrice = resolveSubmittedListingPrice({
      priceAmount,
      priceCdf,
      priceCurrency,
    });
    const syncedDraft = await this.draftsService.getSyncedDraft(draftId);

    if (!syncedDraft || syncedDraft.ownerPhoneNumber !== ownerPhoneNumber) {
      return {
        id: draftId,
        listingSlug: '',
        reasonSummary:
          'Le brouillon synchronisé est introuvable ou ne correspond pas à cette session.',
        shareUrl: '',
        status: 'blocked_needs_fix',
        statusLabel: buildStatusLabel('blocked_needs_fix'),
      };
    }

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const normalizedCategoryId = categoryId.trim() || syncedDraft.categoryId;
    const listingSlug = await this.resolveListingSlug({
      draftId: syncedDraft.draftId,
      title: normalizedTitle || syncedDraft.title,
    });
    const validationError = detectValidationError({
      categoryId: normalizedCategoryId,
      description: normalizedDescription,
      photos: syncedDraft.photos,
      priceAmount: supportedPrice.priceAmount,
      title: normalizedTitle,
    });
    const status = resolveModerationStatus({
      categoryId: normalizedCategoryId,
      validationError,
    });
    const reasonSummary = buildReasonSummary({
      status,
      validationError,
    });

    const listing = await this.prismaService.$transaction(async (transaction: Prisma.TransactionClient) => {
      const persistedListing = await transaction.listing.upsert({
        where: {
          draftId: syncedDraft.draftId,
        },
        create: {
          area: syncedDraft.area,
          attributesJson: toPrismaListingAttributesJson(syncedDraft.attributesJson),
          categoryId: normalizedCategoryId,
          description: normalizedDescription,
          draftId: syncedDraft.draftId,
          moderationStatus: status,
          ownerPhoneNumber,
          priceAmount: supportedPrice.priceAmount,
          priceCdf: supportedPrice.legacyPriceCdf,
          priceCurrency: supportedPrice.priceCurrency,
          publishedAt: status === 'approved' ? new Date() : null,
          slug: listingSlug,
          title: normalizedTitle,
        },
        update: {
          area: syncedDraft.area,
          attributesJson: toPrismaListingAttributesJson(syncedDraft.attributesJson),
          categoryId: normalizedCategoryId,
          description: normalizedDescription,
          moderationStatus: status,
          ownerPhoneNumber,
          priceAmount: supportedPrice.priceAmount,
          priceCdf: supportedPrice.legacyPriceCdf,
          priceCurrency: supportedPrice.priceCurrency,
          publishedAt: status === 'approved' ? new Date() : null,
          slug: listingSlug,
          title: normalizedTitle,
        },
      });

      await transaction.moderationDecision.upsert({
        where: {
          listingId: persistedListing.id,
        },
        create: {
          actorLabel: 'system',
          listingId: persistedListing.id,
          reasonSummary,
          status,
        },
        update: {
          actorLabel: 'system',
          reasonSummary,
          status,
        },
      });

      return persistedListing;
    });

    return {
      id: listing.id,
      listingSlug: listing.slug,
      reasonSummary,
      shareUrl: status === 'approved'
        ? `https://zwibba.com/annonces/${listing.slug}`
        : '',
      status,
      statusLabel: buildStatusLabel(status),
    };
  }

  async listQueue() {
    const decisions = await this.prismaService.moderationDecision.findMany({
      where: {
        status: 'pending_manual_review',
      },
      include: {
        listing: true,
      },
    }) as Array<{
      listing: {
        ownerPhoneNumber: string;
        title: string;
      } | null;
      listingId: string;
      reasonSummary: string;
      status: string;
    }>;

    return {
      items: decisions
        .filter((decision) => decision.listing != null)
        .map((decision) => ({
          id: decision.listingId,
          listingTitle: decision.listing!.title,
          reasonSummary: decision.reasonSummary,
          sellerPhoneNumber: decision.listing!.ownerPhoneNumber,
          status: decision.status as ModerationStatus,
        })),
    };
  }

  async approve(listingId: string) {
    const listing = await this.prismaService.listing.findUnique({
      where: {
        id: listingId,
      },
    });

    if (!listing) {
      throw new NotFoundException('Annonce introuvable.');
    }

    await this.prismaService.listing.update({
      where: {
        id: listingId,
      },
      data: {
        moderationStatus: 'approved',
        publishedAt: new Date(),
      },
    });

    await this.prismaService.moderationDecision.upsert({
      where: {
        listingId,
      },
      create: {
        actorLabel: 'admin',
        listingId,
        reasonSummary: 'Annonce approuvée',
        status: 'approved',
      },
      update: {
        actorLabel: 'admin',
        reasonSummary: 'Annonce approuvée',
        status: 'approved',
      },
    });

    return {
      id: listingId,
      reasonSummary: 'Annonce approuvée',
      status: 'approved' as const,
      statusLabel: buildStatusLabel('approved'),
    };
  }

  async block(listingId: string, rawReasonSummary: string) {
    const listing = await this.prismaService.listing.findUnique({
      where: {
        id: listingId,
      },
    });

    if (!listing) {
      throw new NotFoundException('Annonce introuvable.');
    }

    const reasonSummary =
      rawReasonSummary.trim() || 'Annonce bloquée par la modération Zwibba.';

    await this.prismaService.listing.update({
      where: {
        id: listingId,
      },
      data: {
        moderationStatus: 'blocked_needs_fix',
        publishedAt: null,
      },
    });

    await this.prismaService.moderationDecision.upsert({
      where: {
        listingId,
      },
      create: {
        actorLabel: 'admin',
        listingId,
        reasonSummary,
        status: 'blocked_needs_fix',
      },
      update: {
        actorLabel: 'admin',
        reasonSummary,
        status: 'blocked_needs_fix',
      },
    });

    return {
      id: listingId,
      reasonSummary,
      status: 'blocked_needs_fix' as const,
      statusLabel: buildStatusLabel('blocked_needs_fix'),
    };
  }
}
