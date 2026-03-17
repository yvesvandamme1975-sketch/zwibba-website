import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

type PersistedListingRecord = {
  area: string;
  categoryId: string;
  description: string;
  id: string;
  moderationStatus: string;
  ownerPhoneNumber: string;
  priceCdf: number;
  slug: string;
  title: string;
  updatedAt?: Date;
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

function toListingSummary(listing: PersistedListingRecord) {
  return {
    categoryLabel: getCategoryLabel(listing.categoryId),
    id: listing.id,
    locationLabel: listing.area,
    priceCdf: listing.priceCdf,
    slug: listing.slug,
    title: listing.title,
  };
}

function toListingDetail(listing: PersistedListingRecord) {
  return {
    categoryLabel: getCategoryLabel(listing.categoryId),
    contactActions: ['whatsapp', 'sms', 'call'],
    id: listing.id,
    locationLabel: listing.area,
    priceCdf: listing.priceCdf,
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

@Injectable()
export class ListingsService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
  ) {}

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

    return {
      items: sortedListings.map((listing) =>
        toListingSummary(listing as PersistedListingRecord)
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

    return toListingDetail(listing as PersistedListingRecord);
  }
}
