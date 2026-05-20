import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import {
  canonicalizeLocationLabel,
  normalizeLocationLabel,
} from './location-normalization';

const congoCityPriority = new Map([
  'Kinshasa',
  'Lubumbashi',
  'Likasi',
  'Kolwezi',
  'Goma',
  'Bukavu',
  'Kisangani',
  'Mbuji-Mayi',
  'Kananga',
  'Matadi',
  'Beni',
  'Butembo',
  'Bunia',
  'Tshikapa',
  'Uvira',
].map((label, index) => [normalizeLocationLabel(label), index]));

type LocationListItem = {
  countryCode: string;
  id: string;
  label: string;
  sourceType: string;
  type: string;
};

function getSourceRank(sourceType: string) {
  return sourceType === 'user_suggested' ? 1 : 0;
}

function getCongoCityPriorityRank(label: string) {
  const normalizedLabel = normalizeLocationLabel(label);

  if (congoCityPriority.has(normalizedLabel)) {
    return congoCityPriority.get(normalizedLabel) ?? Number.POSITIVE_INFINITY;
  }

  for (const [city, rank] of congoCityPriority) {
    if (normalizedLabel.startsWith(`${city} `) || normalizedLabel.startsWith(`${city}-`)) {
      return rank;
    }
  }

  return Number.POSITIVE_INFINITY;
}

function compareLocationListItems(left: LocationListItem, right: LocationListItem) {
  return getSourceRank(left.sourceType) - getSourceRank(right.sourceType) ||
    getCongoCityPriorityRank(left.label) - getCongoCityPriorityRank(right.label) ||
    left.label.localeCompare(right.label, 'fr');
}

@Injectable()
export class LocationsService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listCities({
    countryCode,
  }: {
    countryCode: string;
  }) {
    const normalizedCountryCode = countryCode.trim().toUpperCase();

    if (!normalizedCountryCode) {
      throw new BadRequestException('Le pays est requis.');
    }

    const items = await this.prismaService.locationOption.findMany({
      where: {
        countryCode: normalizedCountryCode,
        status: 'active',
        type: 'city',
      },
      orderBy: {
        label: 'asc',
      },
    });

    return {
      items: items.map((item) => ({
        countryCode: item.countryCode,
        id: item.id,
        label: item.label,
        sourceType: item.sourceType,
        type: item.type,
      })).sort(compareLocationListItems),
    };
  }

  async suggestCity({
    countryCode,
    label,
    type,
  }: {
    countryCode: string;
    label: string;
    type: string;
  }) {
    const normalizedCountryCode = countryCode.trim().toUpperCase();
    const normalizedType = type.trim().toLowerCase();
    const normalizedLabel = normalizeLocationLabel(label);

    if (!normalizedCountryCode) {
      throw new BadRequestException('Le pays est requis.');
    }

    if (normalizedType !== 'city') {
      throw new BadRequestException('Type de lieu invalide.');
    }

    if (!normalizedLabel) {
      throw new BadRequestException('Le nom de la ville est requis.');
    }

    const existing = await this.prismaService.locationOption.findUnique({
      where: {
        countryCode_type_normalizedLabel: {
          countryCode: normalizedCountryCode,
          normalizedLabel,
          type: 'city',
        },
      },
    });

    if (existing) {
      return {
        countryCode: existing.countryCode,
        id: existing.id,
        label: existing.label,
        sourceType: existing.sourceType,
        type: existing.type,
      };
    }

    const created = await this.prismaService.locationOption.upsert({
      create: {
        countryCode: normalizedCountryCode,
        label: canonicalizeLocationLabel(label),
        normalizedLabel,
        sourceType: 'user_suggested',
        status: 'active',
        type: 'city',
      },
      update: {},
      where: {
        countryCode_type_normalizedLabel: {
          countryCode: normalizedCountryCode,
          normalizedLabel,
          type: 'city',
        },
      },
    });

    return {
      countryCode: created.countryCode,
      id: created.id,
      label: created.label,
      sourceType: created.sourceType,
      type: created.type,
    };
  }
}
