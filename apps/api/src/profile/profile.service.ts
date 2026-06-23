import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { normalizeDisplayName } from '../common/display-name';
import { PrismaService } from '../database/prisma.service';
import { normalizeLocationLabel } from '../locations/location-normalization';
import { listingLifecycleStatuses, resolveLifecycleStatus } from '../listings/listing-lifecycle';

type PublicSellerListing = {
  area: string;
  categoryId: string;
  draftId: string;
  id: string;
  lifecycleStatus?: string | null;
  moderationStatus: string;
  ownerPhoneNumber: string;
  priceAmount: number;
  priceCdf: number;
  priceCurrency?: string | null;
  slug: string;
  storyImageUrl?: string | null;
  title: string;
  updatedAt?: Date;
};

type PublicSellerDraftPhoto = {
  createdAt?: Date;
  publicUrl: string;
  sourcePresetId?: string;
  uploadStatus: string;
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

function getListingImageUrls(photos: PublicSellerDraftPhoto[] = []) {
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

function isPublicListing(listing: PublicSellerListing) {
  return (
    listing.moderationStatus === 'approved' &&
    resolveLifecycleStatus(listing) === listingLifecycleStatuses.active
  );
}

@Injectable()
export class ProfileService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async getProfile(session: SessionRecord) {
    const user = await this.prismaService.user.findUnique({
      where: {
        phoneNumber: session.phoneNumber,
      },
    });

    if (!user) {
      throw new NotFoundException('Profil introuvable.');
    }

    return this.toProfileResponse(user);
  }

  async updateProfile({
    area,
    session,
  }: {
    area: string;
    session: SessionRecord;
  }) {
    const normalizedArea = normalizeLocationLabel(area);

    if (!normalizedArea) {
      throw new BadRequestException('Choisissez une zone pour votre profil.');
    }

    const location = await this.prismaService.locationOption.findUnique({
      where: {
        countryCode_type_normalizedLabel: {
          countryCode: 'CD',
          normalizedLabel: normalizedArea,
          type: 'city',
        },
      },
    });

    if (!location || location.status !== 'active') {
      throw new BadRequestException('Zone de profil invalide.');
    }

    const user = await this.prismaService.user.update({
      where: {
        phoneNumber: session.phoneNumber,
      },
      data: {
        area: location.label,
      },
    });

    return {
      area: user.area ?? '',
      displayName: user.displayName ?? null,
      memberSince: user.createdAt,
      phoneNumber: user.phoneNumber,
    };
  }

  async updateIdentity({
    displayName,
    session,
  }: {
    displayName: string;
    session: SessionRecord;
  }) {
    const normalizedDisplayName = normalizeDisplayName(displayName);

    const user = await this.prismaService.user.update({
      where: {
        phoneNumber: session.phoneNumber,
      },
      data: {
        displayName: normalizedDisplayName,
      },
    });

    return this.toProfileResponse(user);
  }

  async getPublicSeller(sellerId: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: sellerId,
      },
    });

    if (!user) {
      throw new NotFoundException('Vendeur introuvable.');
    }

    const listings = ((await this.prismaService.listing?.findMany?.({
      where: {
        moderationStatus: 'approved',
        ownerPhoneNumber: user.phoneNumber,
      },
    })) ?? []) as PublicSellerListing[];

    const visibleListings = listings
      .filter(isPublicListing)
      .sort((left, right) => {
        const leftTime = left.updatedAt instanceof Date
          ? left.updatedAt.getTime()
          : 0;
        const rightTime = right.updatedAt instanceof Date
          ? right.updatedAt.getTime()
          : 0;

        return rightTime - leftTime;
      });

    const items = await Promise.all(
      visibleListings.map(async (listing) => {
        const draft = await this.prismaService.draft?.findUnique?.({
          include: {
            photos: true,
          },
          where: {
            id: listing.draftId,
          },
        });
        const images = getListingImageUrls((draft?.photos ?? []) as PublicSellerDraftPhoto[]);

        return {
          categoryId: listing.categoryId,
          categoryLabel: getCategoryLabel(listing.categoryId),
          id: listing.id,
          locationLabel: listing.area,
          priceAmount: listing.priceAmount ?? listing.priceCdf,
          priceCdf: listing.priceCdf,
          priceCurrency: listing.priceCurrency ?? 'CDF',
          primaryImageUrl: images[0] ?? null,
          slug: listing.slug,
          storyImageUrl: listing.storyImageUrl ?? null,
          title: listing.title,
        };
      }),
    );

    return {
      listings: items,
      seller: {
        displayName: user.displayName ?? 'Vendeur Zwibba',
        id: user.id,
        memberSince: user.createdAt,
      },
    };
  }

  private toProfileResponse(user: {
    area: string | null;
    createdAt: Date;
    displayName: string | null;
    phoneNumber: string;
  }) {
    return {
      area: user.area ?? '',
      displayName: user.displayName ?? null,
      memberSince: user.createdAt,
      phoneNumber: user.phoneNumber,
    };
  }
}
