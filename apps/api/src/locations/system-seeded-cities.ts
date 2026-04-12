import { normalizeLocationLabel } from './location-normalization';

type SeededCityRecord = {
  countryCode: string;
  label: string;
  normalizedLabel: string;
  sourceType: 'system_seed';
  status: 'active';
  type: 'city';
};

const rawCongoCities = [
  'Beni',
  'Bukavu',
  'Bunia',
  'Butembo',
  'Goma',
  'Kananga',
  'Kinshasa',
  'Kisangani',
  'Kolwezi',
  'Likasi',
  'Lubumbashi',
  'Matadi',
  'Mbuji-Mayi',
  'Tshikapa',
  'Uvira',
];

export function buildSystemSeededCities(): SeededCityRecord[] {
  return rawCongoCities.map((label) => ({
    countryCode: 'CD',
    label,
    normalizedLabel: normalizeLocationLabel(label),
    sourceType: 'system_seed',
    status: 'active',
    type: 'city',
  }));
}

type LocationSeedPersistenceClient = {
  locationOption: {
    upsert(args: {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
      where: {
        countryCode_type_normalizedLabel: {
          countryCode: string;
          normalizedLabel: string;
          type: string;
        };
      };
    }): Promise<unknown>;
  };
};

export async function upsertSystemSeededCities(prisma: LocationSeedPersistenceClient) {
  const definitions = buildSystemSeededCities();

  for (const definition of definitions) {
    await prisma.locationOption.upsert({
      create: definition,
      update: {
        label: definition.label,
        sourceType: definition.sourceType,
        status: definition.status,
      },
      where: {
        countryCode_type_normalizedLabel: {
          countryCode: definition.countryCode,
          normalizedLabel: definition.normalizedLabel,
          type: definition.type,
        },
      },
    });
  }

  return {
    total: definitions.length,
  };
}
