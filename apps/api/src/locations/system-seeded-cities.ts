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
];

const rawBelgianCities = [
  'Bruxelles',
  'Anvers',
  'Gand',
  'Charleroi',
  'Liège',
  'Bruges',
  'Namur',
  'Louvain',
  'Mons',
  'Malines',
  'La Louvière',
  'Courtrai',
  'Hasselt',
  'Ostende',
  'Tournai',
];

function buildSeededCityRecords(
  countryCode: string,
  labels: string[],
): SeededCityRecord[] {
  return labels.map((label) => ({
    countryCode,
    label,
    normalizedLabel: normalizeLocationLabel(label),
    sourceType: 'system_seed',
    status: 'active',
    type: 'city',
  }));
}

export function buildSystemSeededCities(): SeededCityRecord[] {
  return [
    ...buildSeededCityRecords('CD', rawCongoCities),
    ...buildSeededCityRecords('BE', rawBelgianCities),
  ];
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
