import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../database/prisma.service';

export type SyncedDraftPhotoRecord = {
  objectKey: string;
  photoId: string;
  publicUrl: string;
  sourcePresetId: string;
  uploadStatus: string;
};

export type SyncedDraftRecord = {
  area: string;
  categoryId: string;
  condition: string;
  description: string;
  draftId: string;
  ownerPhoneNumber: string;
  photos: SyncedDraftPhotoRecord[];
  priceCdf: number;
  syncStatus: 'synced';
  title: string;
};

@Injectable()
export class DraftsService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
  ) {}

  async syncDraft({
    area,
    categoryId,
    description,
    draftId,
    phoneNumber,
    photos,
    priceCdf,
    title,
  }: {
    area: string;
    categoryId: string;
    description: string;
    draftId?: string;
    phoneNumber: string;
    photos: SyncedDraftPhotoRecord[];
    priceCdf: number;
    title: string;
  }): Promise<SyncedDraftRecord> {
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
            area,
            categoryId,
            description,
            ownerPhoneNumber: phoneNumber,
            priceCdf,
            title,
          },
        })
      : await this.prismaService.draft.create({
          data: {
            area,
            categoryId,
            description,
            id: generatedDraftId,
            ownerPhoneNumber: phoneNumber,
            priceCdf,
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
      area,
      categoryId,
      condition: persistedDraft.condition,
      description,
      draftId: persistedDraft.id,
      ownerPhoneNumber: phoneNumber,
      photos: normalizedPhotos,
      priceCdf,
      syncStatus: 'synced' as const,
      title,
    };
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
      categoryId: draft.categoryId,
      condition: draft.condition,
      description: draft.description,
      draftId: draft.id,
      ownerPhoneNumber: draft.ownerPhoneNumber,
      photos: draft.photos.map((photo) => ({
        objectKey: photo.objectKey,
        photoId: photo.id,
        publicUrl: photo.publicUrl,
        sourcePresetId: photo.sourcePresetId,
        uploadStatus: photo.uploadStatus,
      })),
      priceCdf: draft.priceCdf,
      syncStatus: 'synced' as const,
      title: draft.title,
    };
  }
}
