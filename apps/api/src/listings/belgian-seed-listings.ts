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

type RawBelgianSeed = {
  area: string;
  categoryId: string;
  condition: string;
  description: string;
  ownerPhoneNumber: string;
  photoPublicUrl: string;
  priceAmount: number;
  priceCurrency: 'EUR';
  publishedAt: string;
  slug: string;
  title: string;
};

// Placeholder Belgian content for local demos only. Yves must replace these
// titles, phone numbers and images before any production seed run.
const rawBelgianSeeds: RawBelgianSeed[] = [
  {
    area: 'Bruxelles',
    categoryId: 'vehicles',
    condition: 'used_good',
    description: 'Velo cargo electrique familial avec batterie recente, disponible a Bruxelles.',
    ownerPhoneNumber: '+32470000001',
    photoPublicUrl: '/assets/listings/be-velo-cargo-electrique-bruxelles.jpg',
    priceAmount: 950,
    priceCurrency: 'EUR',
    publishedAt: '2026-08-14T08:10:00.000Z',
    slug: 'be-velo-cargo-electrique-bruxelles',
    title: 'Velo cargo electrique a Bruxelles',
  },
  {
    area: 'Anvers',
    categoryId: 'home_garden',
    condition: 'used_good',
    description: 'Canape deux places propre, a enlever pres du centre d Anvers.',
    ownerPhoneNumber: '+32470000002',
    photoPublicUrl: '/assets/listings/be-canape-deux-places-anvers.jpg',
    priceAmount: 180,
    priceCurrency: 'EUR',
    publishedAt: '2026-08-14T08:12:00.000Z',
    slug: 'be-canape-deux-places-anvers',
    title: 'Canape deux places a Anvers',
  },
  {
    area: 'Liege',
    categoryId: 'electronics',
    condition: 'used_good',
    description: 'Ordinateur portable de travail avec chargeur, clavier AZERTY belge.',
    ownerPhoneNumber: '+32470000003',
    photoPublicUrl: '/assets/listings/be-ordinateur-portable-liege.jpg',
    priceAmount: 420,
    priceCurrency: 'EUR',
    publishedAt: '2026-08-14T08:14:00.000Z',
    slug: 'be-ordinateur-portable-liege',
    title: 'Ordinateur portable a Liege',
  },
];

function buildSeedIdentifiers(slug: string) {
  return {
    draftId: `be_seed_draft_${slug}`,
    listingId: `be_seed_listing_${slug}`,
    photoId: `be_seed_photo_${slug}`,
  };
}

export function buildBelgianSeedDefinitions() {
  return rawBelgianSeeds.map((seed) => {
    const ids = buildSeedIdentifiers(seed.slug);
    const publishedAt = new Date(seed.publishedAt);

    return {
      draft: {
        area: seed.area,
        categoryId: seed.categoryId,
        condition: seed.condition,
        countryCode: 'BE',
        description: seed.description,
        id: ids.draftId,
        ownerPhoneNumber: seed.ownerPhoneNumber,
        priceAmount: seed.priceAmount,
        priceCdf: seed.priceAmount,
        priceCurrency: seed.priceCurrency,
        syncStatus: 'synced',
        title: seed.title,
      },
      listing: {
        area: seed.area,
        categoryId: seed.categoryId,
        countryCode: 'BE',
        description: seed.description,
        draftId: ids.draftId,
        id: ids.listingId,
        lifecycleChangedAt: publishedAt,
        lifecycleStatus: 'active',
        moderationStatus: 'approved',
        ownerPhoneNumber: seed.ownerPhoneNumber,
        previousLifecycleStatusBeforeDelete: null,
        priceAmount: seed.priceAmount,
        priceCdf: seed.priceAmount,
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
        objectKey: `belgian-seeds/${seed.slug}.jpg`,
        publicUrl: seed.photoPublicUrl,
        sourcePresetId: 'capture',
        uploadStatus: 'uploaded',
      },
    };
  });
}

export async function upsertBelgianSeedListings(prisma: SeedPersistenceClient) {
  const definitions = buildBelgianSeedDefinitions();
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
        countryCode: definition.draft.countryCode,
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
        countryCode: definition.listing.countryCode,
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
