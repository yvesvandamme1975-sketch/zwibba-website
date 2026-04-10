type SeedPersistenceClient = {
  draft: {
    upsert(args: {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
      where: { id: string };
    }): Promise<unknown>;
  };
  draftPhoto: {
    upsert(args: {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
      where: { id: string };
    }): Promise<unknown>;
  };
  listing: {
    findUnique?(args: {
      where: { slug: string };
    }): Promise<Record<string, unknown> | null>;
    upsert(args: {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
      where: { slug: string };
    }): Promise<unknown>;
  };
};

type RawSystemSeed = {
  area: string;
  categoryId: string;
  condition: string;
  description: string;
  ownerPhoneNumber: string;
  photoPublicUrl: string;
  priceAmount: number;
  priceCdf: number;
  priceCurrency: 'CDF' | 'USD';
  publishedAt: string;
  slug: string;
  title: string;
};

const rawSystemSeeds: RawSystemSeed[] = [
  {
    area: 'Lubumbashi Centre',
    categoryId: 'services',
    condition: 'service',
    description:
      'Intervention rapide sur fuites, installations et dépannages courants à Lubumbashi Centre.',
    ownerPhoneNumber: '+243990009011',
    photoPublicUrl: '/assets/listings/service-plomberie-urgence-7j7.jpg',
    priceAmount: 25000,
    priceCdf: 25000,
    priceCurrency: 'CDF',
    publishedAt: '2026-04-10T08:10:00.000Z',
    slug: 'service-plomberie-urgence-7j7',
    title: 'Service plomberie urgence 7j/7',
  },
  {
    area: 'Lubumbashi Centre',
    categoryId: 'emploi',
    condition: 'cdd',
    description:
      'La clinique recherche une réceptionniste organisée pour accueil, agenda et suivi administratif simple.',
    ownerPhoneNumber: '+243990009012',
    photoPublicUrl: '/assets/listings/offre-receptionniste-lubumbashi-centre.jpg',
    priceAmount: 1800000,
    priceCdf: 1800000,
    priceCurrency: 'CDF',
    publishedAt: '2026-04-10T08:12:00.000Z',
    slug: 'offre-receptionniste-lubumbashi-centre',
    title: 'Offre réceptionniste Lubumbashi Centre',
  },
  {
    area: 'Marché Kenya',
    categoryId: 'food',
    condition: 'fresh',
    description:
      'Lot de mangues et d’avocats frais pour achat de proximité au marché Kenya.',
    ownerPhoneNumber: '+243990009013',
    photoPublicUrl: '/assets/listings/mangues-et-avocats-frais-du-haut-katanga.jpg',
    priceAmount: 12000,
    priceCdf: 12000,
    priceCurrency: 'CDF',
    publishedAt: '2026-04-10T08:14:00.000Z',
    slug: 'mangues-et-avocats-frais-du-haut-katanga',
    title: 'Mangues et avocats frais du Haut-Katanga',
  },
  {
    area: 'Annexe',
    categoryId: 'agriculture',
    condition: 'used_good',
    description:
      'Pulvérisateur dorsal 16 litres prêt à l’emploi pour petite exploitation ou maraîchage.',
    ownerPhoneNumber: '+243990009014',
    photoPublicUrl: '/assets/listings/pulverisateur-agricole-16l-lubumbashi.jpg',
    priceAmount: 85000,
    priceCdf: 85000,
    priceCurrency: 'CDF',
    publishedAt: '2026-04-10T08:16:00.000Z',
    slug: 'pulverisateur-agricole-16l-lubumbashi',
    title: 'Pulvérisateur agricole 16L en bon état',
  },
  {
    area: 'Bel Air',
    categoryId: 'construction',
    condition: 'used_good',
    description:
      'Lot pour petits travaux avec ciment, truelle et accessoires de chantier disponibles immédiatement.',
    ownerPhoneNumber: '+243990009015',
    photoPublicUrl: '/assets/listings/lot-ciment-outils-chantier-lubumbashi.jpg',
    priceAmount: 320000,
    priceCdf: 320000,
    priceCurrency: 'CDF',
    publishedAt: '2026-04-10T08:18:00.000Z',
    slug: 'lot-ciment-outils-chantier-lubumbashi',
    title: 'Lot ciment et outils de chantier',
  },
  {
    area: 'Lubumbashi Centre',
    categoryId: 'education',
    condition: 'new_item',
    description:
      'Pack prêt pour rentrée scolaire ou universitaire avec cahiers, stylos et calculatrice de base.',
    ownerPhoneNumber: '+243990009016',
    photoPublicUrl: '/assets/listings/pack-fournitures-scolaires-universitaires.jpg',
    priceAmount: 28000,
    priceCdf: 28000,
    priceCurrency: 'CDF',
    publishedAt: '2026-04-10T08:20:00.000Z',
    slug: 'pack-fournitures-scolaires-universitaires',
    title: 'Pack fournitures scolaires et universitaires',
  },
  {
    area: 'Golf',
    categoryId: 'sports_leisure',
    condition: 'used_good',
    description:
      'Vélo fitness et loisir en bon état, prêt à rouler pour entraînement ou détente.',
    ownerPhoneNumber: '+243990009017',
    photoPublicUrl: '/assets/listings/velo-fitness-loisir-lubumbashi.jpg',
    priceAmount: 240000,
    priceCdf: 240000,
    priceCurrency: 'CDF',
    publishedAt: '2026-04-10T08:22:00.000Z',
    slug: 'velo-fitness-loisir-lubumbashi',
    title: 'Vélo fitness et loisir en bon état',
  },
];

function buildSeedIdentifiers(slug: string) {
  return {
    draftId: `seed_draft_${slug}`,
    listingId: `seed_listing_${slug}`,
    photoId: `seed_photo_${slug}`,
  };
}

export function buildSystemSeedDefinitions() {
  return rawSystemSeeds.map((seed) => {
    const ids = buildSeedIdentifiers(seed.slug);
    const publishedAt = new Date(seed.publishedAt);

    return {
      draft: {
        area: seed.area,
        categoryId: seed.categoryId,
        condition: seed.condition,
        description: seed.description,
        id: ids.draftId,
        ownerPhoneNumber: seed.ownerPhoneNumber,
        priceAmount: seed.priceAmount,
        priceCdf: seed.priceCdf,
        priceCurrency: seed.priceCurrency,
        syncStatus: 'synced',
        title: seed.title,
      },
      listing: {
        area: seed.area,
        categoryId: seed.categoryId,
        description: seed.description,
        draftId: ids.draftId,
        id: ids.listingId,
        lifecycleChangedAt: publishedAt,
        lifecycleStatus: 'active',
        moderationStatus: 'approved',
        ownerPhoneNumber: seed.ownerPhoneNumber,
        previousLifecycleStatusBeforeDelete: null,
        priceAmount: seed.priceAmount,
        priceCdf: seed.priceCdf,
        priceCurrency: seed.priceCurrency,
        publishedAt,
        slug: seed.slug,
        soldChannel: null,
        sourceType: 'system_seed',
        title: seed.title,
      },
      photo: {
        draftId: ids.draftId,
        id: ids.photoId,
        objectKey: `system-seeds/${seed.slug}.jpg`,
        publicUrl: seed.photoPublicUrl,
        sourcePresetId: 'capture',
        uploadStatus: 'uploaded',
      },
    };
  });
}

export async function upsertSystemSeedListings(prisma: SeedPersistenceClient) {
  const definitions = buildSystemSeedDefinitions();
  let created = 0;
  let updated = 0;

  for (const definition of definitions) {
    const existingListing = prisma.listing.findUnique
      ? await prisma.listing.findUnique({
          where: {
            slug: definition.listing.slug,
          },
        })
      : null;

    await prisma.draft.upsert({
      create: definition.draft,
      update: {
        area: definition.draft.area,
        categoryId: definition.draft.categoryId,
        condition: definition.draft.condition,
        description: definition.draft.description,
        ownerPhoneNumber: definition.draft.ownerPhoneNumber,
        priceAmount: definition.draft.priceAmount,
        priceCdf: definition.draft.priceCdf,
        priceCurrency: definition.draft.priceCurrency,
        syncStatus: definition.draft.syncStatus,
        title: definition.draft.title,
      },
      where: {
        id: definition.draft.id,
      },
    });

    await prisma.draftPhoto.upsert({
      create: definition.photo,
      update: {
        objectKey: definition.photo.objectKey,
        publicUrl: definition.photo.publicUrl,
        sourcePresetId: definition.photo.sourcePresetId,
        uploadStatus: definition.photo.uploadStatus,
      },
      where: {
        id: definition.photo.id,
      },
    });

    await prisma.listing.upsert({
      create: definition.listing,
      update: {
        area: definition.listing.area,
        categoryId: definition.listing.categoryId,
        description: definition.listing.description,
        draftId: definition.listing.draftId,
        lifecycleChangedAt: definition.listing.lifecycleChangedAt,
        lifecycleStatus: definition.listing.lifecycleStatus,
        moderationStatus: definition.listing.moderationStatus,
        ownerPhoneNumber: definition.listing.ownerPhoneNumber,
        previousLifecycleStatusBeforeDelete:
          definition.listing.previousLifecycleStatusBeforeDelete,
        priceAmount: definition.listing.priceAmount,
        priceCdf: definition.listing.priceCdf,
        priceCurrency: definition.listing.priceCurrency,
        publishedAt: definition.listing.publishedAt,
        soldChannel: definition.listing.soldChannel,
        sourceType: definition.listing.sourceType,
        title: definition.listing.title,
      },
      where: {
        slug: definition.listing.slug,
      },
    });

    if (existingListing) {
      updated += 1;
    } else if (prisma.listing.findUnique) {
      created += 1;
    } else {
      updated += 1;
    }
  }

  return {
    created,
    total: definitions.length,
    updated,
  };
}
