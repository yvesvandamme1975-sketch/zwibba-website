import { BadRequestException } from '@nestjs/common';

export const listingLifecycleStatuses = {
  active: 'active',
  deletedBySeller: 'deleted_by_seller',
  paused: 'paused',
  sold: 'sold',
} as const;

export const soldReasonLabels: Record<string, string> = {
  sold_elsewhere: 'Vendu ailleurs',
  sold_on_zwibba: 'Vendu sur Zwibba',
};

export const deleteReasonLabels: Record<string, string> = {
  duplicate_or_error: 'Doublon ou erreur',
  not_available: 'Plus disponible',
  other: 'Autre',
  republish_later: 'Je republierai plus tard',
};

const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

export function resolveLifecycleStatus(listing: {
  lifecycleStatus?: string | null;
}) {
  return listing.lifecycleStatus || listingLifecycleStatuses.active;
}

export function buildLifecycleStatusLabel(status: string) {
  switch (status) {
    case listingLifecycleStatuses.paused:
      return 'En pause';
    case listingLifecycleStatuses.sold:
      return 'Vendue';
    case listingLifecycleStatuses.deletedBySeller:
      return 'Archivée';
    case listingLifecycleStatuses.active:
    default:
      return 'Active';
  }
}

export function buildDeleteReasonLabel(reasonCode: string | null | undefined) {
  if (!reasonCode) {
    return null;
  }

  return deleteReasonLabels[reasonCode] ?? reasonCode;
}

export function buildSoldChannelLabel(reasonCode: string | null | undefined) {
  if (!reasonCode) {
    return null;
  }

  return soldReasonLabels[reasonCode] ?? reasonCode;
}

export function resolveRestoreUntil(deletedBySellerAt: Date | null | undefined) {
  if (!(deletedBySellerAt instanceof Date)) {
    return null;
  }

  return new Date(deletedBySellerAt.getTime() + thirtyDaysInMs);
}

export function canRestoreListing({
  deletedBySellerAt,
  lifecycleStatus,
  now = new Date(),
}: {
  deletedBySellerAt?: Date | null;
  lifecycleStatus?: string | null;
  now?: Date;
}) {
  if (resolveLifecycleStatus({ lifecycleStatus }) !== listingLifecycleStatuses.deletedBySeller) {
    return false;
  }

  const restoreUntil = resolveRestoreUntil(deletedBySellerAt);

  return Boolean(restoreUntil && restoreUntil.getTime() >= now.getTime());
}

export function resolveLifecycleCapabilities({
  deletedBySellerAt,
  lifecycleStatus,
  moderationStatus,
  now = new Date(),
}: {
  deletedBySellerAt?: Date | null;
  lifecycleStatus?: string | null;
  moderationStatus?: string | null;
  now?: Date;
}) {
  const normalizedStatus = resolveLifecycleStatus({ lifecycleStatus });
  const isApproved = moderationStatus === 'approved';

  return {
    canDelete: normalizedStatus !== listingLifecycleStatuses.deletedBySeller,
    canMarkSold: isApproved && normalizedStatus === listingLifecycleStatuses.active,
    canPause: isApproved && normalizedStatus === listingLifecycleStatuses.active,
    canResume: isApproved && normalizedStatus === listingLifecycleStatuses.paused,
    canRelist: normalizedStatus === listingLifecycleStatuses.sold,
    canRestore: canRestoreListing({
      deletedBySellerAt,
      lifecycleStatus: normalizedStatus,
      now,
    }),
  };
}

export function applyLifecycleAction({
  action,
  currentListing,
  now = new Date(),
  ownerPhoneNumber,
  reasonCode = '',
}: {
  action: string;
  currentListing: {
    deletedBySellerAt?: Date | null;
    deletedReason?: string | null;
    lifecycleStatus?: string | null;
    moderationStatus?: string | null;
    previousLifecycleStatusBeforeDelete?: string | null;
    soldChannel?: string | null;
  };
  now?: Date;
  ownerPhoneNumber: string;
  reasonCode?: string;
}) {
  const currentStatus = resolveLifecycleStatus(currentListing);

  switch (action) {
    case 'pause': {
      if (currentListing.moderationStatus !== 'approved') {
        throw new BadRequestException("Seule une annonce publiée peut être mise en pause.");
      }

      if (currentStatus !== listingLifecycleStatuses.active) {
        throw new BadRequestException("Cette annonce ne peut pas être mise en pause.");
      }

      return {
        event: {
          action: 'paused',
          actorPhoneNumber: ownerPhoneNumber,
          metadataJson: undefined,
          nextStatus: listingLifecycleStatuses.paused,
          previousStatus: currentStatus,
          reasonCode: null,
          reasonLabel: null,
        },
        updates: {
          lifecycleChangedAt: now,
          lifecycleStatus: listingLifecycleStatuses.paused,
          pausedAt: now,
        },
      };
    }
    case 'resume': {
      if (currentListing.moderationStatus !== 'approved') {
        throw new BadRequestException("Seule une annonce publiée peut être remise en ligne.");
      }

      if (currentStatus !== listingLifecycleStatuses.paused) {
        throw new BadRequestException("Cette annonce n’est pas en pause.");
      }

      return {
        event: {
          action: 'resumed',
          actorPhoneNumber: ownerPhoneNumber,
          metadataJson: undefined,
          nextStatus: listingLifecycleStatuses.active,
          previousStatus: currentStatus,
          reasonCode: null,
          reasonLabel: null,
        },
        updates: {
          lifecycleChangedAt: now,
          lifecycleStatus: listingLifecycleStatuses.active,
          pausedAt: null,
        },
      };
    }
    case 'mark_sold': {
      if (currentListing.moderationStatus !== 'approved') {
        throw new BadRequestException("Seule une annonce publiée peut être marquée comme vendue.");
      }

      if (!soldReasonLabels[reasonCode]) {
        throw new BadRequestException('Choisissez comment l’annonce a été vendue.');
      }

      if (currentStatus !== listingLifecycleStatuses.active) {
        throw new BadRequestException("Cette annonce ne peut pas être marquée comme vendue.");
      }

      return {
        event: {
          action: 'marked_sold',
          actorPhoneNumber: ownerPhoneNumber,
          metadataJson: undefined,
          nextStatus: listingLifecycleStatuses.sold,
          previousStatus: currentStatus,
          reasonCode,
          reasonLabel: buildSoldChannelLabel(reasonCode),
        },
        updates: {
          lifecycleChangedAt: now,
          lifecycleStatus: listingLifecycleStatuses.sold,
          soldAt: now,
          soldChannel: reasonCode,
        },
      };
    }
    case 'delete': {
      if (!deleteReasonLabels[reasonCode]) {
        throw new BadRequestException('Choisissez pourquoi vous supprimez cette annonce.');
      }

      if (currentStatus === listingLifecycleStatuses.deletedBySeller) {
        throw new BadRequestException('Cette annonce est déjà archivée.');
      }

      return {
        event: {
          action: 'deleted_by_seller',
          actorPhoneNumber: ownerPhoneNumber,
          metadataJson: {
            restoreUntil: resolveRestoreUntil(now)?.toISOString() ?? null,
          },
          nextStatus: listingLifecycleStatuses.deletedBySeller,
          previousStatus: currentStatus,
          reasonCode,
          reasonLabel: buildDeleteReasonLabel(reasonCode),
        },
        updates: {
          deletedBySellerAt: now,
          deletedReason: reasonCode,
          lifecycleChangedAt: now,
          lifecycleStatus: listingLifecycleStatuses.deletedBySeller,
          previousLifecycleStatusBeforeDelete: currentStatus,
        },
      };
    }
    case 'restore': {
      if (
        !canRestoreListing({
          deletedBySellerAt: currentListing.deletedBySellerAt,
          lifecycleStatus: currentStatus,
          now,
        })
      ) {
        throw new BadRequestException("Cette annonce ne peut plus être restaurée.");
      }

      const nextStatus =
        currentListing.previousLifecycleStatusBeforeDelete || listingLifecycleStatuses.active;

      return {
        event: {
          action: 'restored',
          actorPhoneNumber: ownerPhoneNumber,
          metadataJson: undefined,
          nextStatus,
          previousStatus: currentStatus,
          reasonCode: null,
          reasonLabel: null,
        },
        updates: {
          deletedBySellerAt: null,
          deletedReason: null,
          lifecycleChangedAt: now,
          lifecycleStatus: nextStatus,
          previousLifecycleStatusBeforeDelete: null,
        },
      };
    }
    case 'relist': {
      if (currentStatus !== listingLifecycleStatuses.sold) {
        throw new BadRequestException("Seule une annonce vendue peut être remise en vente.");
      }

      return {
        event: {
          action: 'relisted',
          actorPhoneNumber: ownerPhoneNumber,
          metadataJson: undefined,
          nextStatus: listingLifecycleStatuses.active,
          previousStatus: currentStatus,
          reasonCode: null,
          reasonLabel: null,
        },
        updates: {
          lifecycleChangedAt: now,
          lifecycleStatus: listingLifecycleStatuses.active,
          soldAt: null,
          soldChannel: null,
        },
      };
    }
    default:
      throw new BadRequestException('Action vendeur inconnue.');
  }
}
