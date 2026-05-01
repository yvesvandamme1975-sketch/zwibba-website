import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  ListingPriceCurrency,
  resolveSubmittedListingPrice,
} from '../common/price-validation';
import {
  type ListingAttributesJson,
  normalizeListingAttributesJson,
  toPrismaListingAttributesJson,
} from '../common/listing-attributes';
import { PrismaService } from '../database/prisma.service';
import { R2StorageService } from '../media/r2-storage.service';

export type SyncedDraftPhotoRecord = {
  objectKey: string;
  photoId: string;
  publicUrl: string;
  sourcePresetId: string;
  uploadStatus: string;
};

export type SyncedDraftRecord = {
  area: string;
  attributesJson: ListingAttributesJson;
  categoryId: string;
  condition: string;
  description: string;
  draftId: string;
  ownerPhoneNumber: string;
  photos: SyncedDraftPhotoRecord[];
  priceAmount: number;
  priceCdf: number;
  priceCurrency: ListingPriceCurrency;
  syncStatus: 'synced';
  title: string;
};

@Injectable()
export class DraftsService {
  private readonly logger = new Logger(DraftsService.name);

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(R2StorageService) private readonly r2StorageService: R2StorageService,
  ) {}

  async syncDraft({
    area,
    attributesJson,
    categoryId,
    condition,
    description,
    draftId,
    phoneNumber,
    photos,
    priceAmount,
    priceCdf,
    priceCurrency,
    title,
  }: {
    area: string;
    attributesJson?: unknown;
    categoryId: string;
    condition?: string;
    description: string;
    draftId?: string;
    phoneNumber: string;
    photos: SyncedDraftPhotoRecord[];
    priceAmount?: number;
    priceCdf?: number;
    priceCurrency?: string;
    title: string;
  }): Promise<SyncedDraftRecord> {
    const supportedPrice = resolveSubmittedListingPrice({
      priceAmount,
      priceCdf,
      priceCurrency,
    });
    const resolvedArea = (await this.resolveProfileArea(phoneNumber, area)) ?? '';
    const normalizedAttributesJson = normalizeListingAttributesJson(attributesJson);
    const existingDraft = draftId
      ? await this.prismaService.draft.findFirst({
          where: {
            id: draftId,
            ownerPhoneNumber: phoneNumber,
          },
        })
      : null;
    const slugBase = title
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');
    const generatedDraftId = `draft_${slugBase || 'zwibba'}_${randomUUID().slice(0, 8)}`;
    const normalizedPhotos: SyncedDraftPhotoRecord[] = photos.map((photo) => ({
      objectKey: photo.objectKey,
      photoId: photo.photoId,
      publicUrl: photo.publicUrl,
      sourcePresetId: photo.sourcePresetId,
      uploadStatus: photo.uploadStatus,
    }));
    const persistedPhotoData = normalizedPhotos.map((photo) => ({
      id: photo.photoId,
      objectKey: photo.objectKey,
      publicUrl: photo.publicUrl,
      sourcePresetId: photo.sourcePresetId,
      uploadStatus: photo.uploadStatus,
    }));
    const persistedDraft = existingDraft
      ? await this.prismaService.draft.update({
          where: {
            id: existingDraft.id,
          },
          data: {
            area: resolvedArea,
            attributesJson: toPrismaListingAttributesJson(normalizedAttributesJson),
            categoryId,
            condition: condition ?? existingDraft.condition,
            description,
            ownerPhoneNumber: phoneNumber,
            priceAmount: supportedPrice.priceAmount,
            priceCdf: supportedPrice.legacyPriceCdf,
            priceCurrency: supportedPrice.priceCurrency,
            title,
          },
        })
      : await this.prismaService.draft.create({
          data: {
            area: resolvedArea,
            attributesJson: toPrismaListingAttributesJson(normalizedAttributesJson),
            categoryId,
            condition: condition ?? '',
            description,
            id: generatedDraftId,
            ownerPhoneNumber: phoneNumber,
            priceAmount: supportedPrice.priceAmount,
            priceCdf: supportedPrice.legacyPriceCdf,
            priceCurrency: supportedPrice.priceCurrency,
            title,
          },
        });

    await this.prismaService.draftPhoto.deleteMany({
      where: {
        draftId: persistedDraft.id,
      },
    });

    for (const photo of persistedPhotoData) {
      await this.prismaService.draftPhoto.create({
        data: {
          ...photo,
          draftId: persistedDraft.id,
        },
      });
    }

    return {
      area: resolvedArea,
      attributesJson: normalizedAttributesJson,
      categoryId,
      condition: persistedDraft.condition ?? condition ?? '',
      description,
      draftId: persistedDraft.id,
      ownerPhoneNumber: phoneNumber,
      photos: normalizedPhotos,
      priceAmount: supportedPrice.priceAmount,
      priceCdf: supportedPrice.legacyPriceCdf,
      priceCurrency: supportedPrice.priceCurrency,
      syncStatus: 'synced' as const,
      title,
    };
  }

  private async resolveProfileArea(phoneNumber: string, submittedArea: string) {
    const normalizedArea = submittedArea.trim();

    if (normalizedArea) {
      return normalizedArea;
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        phoneNumber,
      },
    });

    return user?.area?.trim() ?? '';
  }

  async getSyncedDraft(draftId: string): Promise<SyncedDraftRecord | undefined> {
    const draft = await this.prismaService.draft.findUnique({
      where: {
        id: draftId,
      },
      include: {
        photos: true,
      },
    });

    if (!draft) {
      return undefined;
    }

    return {
      area: draft.area,
      attributesJson: normalizeListingAttributesJson((draft as { attributesJson?: unknown }).attributesJson),
      categoryId: draft.categoryId,
      condition: draft.condition,
      description: draft.description,
      draftId: draft.id,
      ownerPhoneNumber: draft.ownerPhoneNumber,
      photos: draft.photos.map((photo: {
        id: string;
        objectKey: string;
        publicUrl: string;
        sourcePresetId: string;
        uploadStatus: string;
      }) => ({
        objectKey: photo.objectKey,
        photoId: photo.id,
        publicUrl: photo.publicUrl,
        sourcePresetId: photo.sourcePresetId,
        uploadStatus: photo.uploadStatus,
      })),
      priceAmount: draft.priceAmount ?? draft.priceCdf,
      priceCdf: draft.priceCdf,
      priceCurrency: (draft.priceCurrency ?? 'CDF') as ListingPriceCurrency,
      syncStatus: 'synced' as const,
      title: draft.title,
    };
  }

  async deleteDraft({
    draftId,
    phoneNumber,
  }: {
    draftId: string;
    phoneNumber: string;
  }) {
    const draft = await this.prismaService.draft.findFirst({
      where: {
        id: draftId,
        ownerPhoneNumber: phoneNumber,
      },
      include: {
        listing: true,
        photos: true,
      },
    });

    if (!draft) {
      throw new NotFoundException('Brouillon introuvable.');
    }

    if (draft.listing) {
      throw new ConflictException("Impossible d'abandonner une annonce déjà publiée.");
    }

    for (const photo of draft.photos) {
      try {
        await this.r2StorageService.deleteObject(photo.objectKey);
      } catch (error) {
        this.logger.warn(
          `Unable to delete draft photo object ${photo.objectKey}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    await this.prismaService.draft.delete({
      where: {
        id: draft.id,
      },
    });

    return {
      draftId: draft.id,
      status: 'deleted' as const,
    };
  }
}
