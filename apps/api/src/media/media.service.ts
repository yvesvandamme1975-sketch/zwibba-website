import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { R2StorageService } from './r2-storage.service';

@Injectable()
export class MediaService {
  constructor(
    @Inject(R2StorageService)
    private readonly r2StorageService: R2StorageService,
  ) {}

  async createUploadSlot({
    contentType,
    fileName,
    sourcePresetId,
  }: {
    contentType: string;
    fileName: string;
    sourcePresetId: string;
  }) {
    const safeFileName =
      fileName.trim().replaceAll(/[^a-zA-Z0-9._-]+/g, '-').replaceAll(/^-+|-+$/g, '') ||
      'upload.bin';
    const safePresetId =
      sourcePresetId
        .trim()
        .replaceAll(/[^a-zA-Z0-9_-]+/g, '-')
        .replaceAll(/^-+|-+$/g, '') || 'capture';
    const photoId = `photo_${safePresetId}_${randomUUID().slice(0, 8)}`;
    const objectKey = `draft-photos/${safePresetId}/${photoId}-${safeFileName}`;
    const upload = await this.r2StorageService.createPresignedUpload({
      contentType,
      objectKey,
    });

    return {
      objectKey: upload.objectKey,
      photoId,
      publicUrl: upload.publicUrl,
      sourcePresetId: safePresetId,
      uploadUrl: upload.uploadUrl,
    };
  }

  async discardUploadedObjects(objectKeys: string[]) {
    const uniqueObjectKeys = Array.from(
      new Set(
        objectKeys
          .filter((objectKey) => typeof objectKey === 'string')
          .map((objectKey) => objectKey.trim())
          .filter((objectKey) => objectKey.startsWith('draft-photos/')),
      ),
    );

    for (const objectKey of uniqueObjectKeys) {
      await this.r2StorageService.deleteObject(objectKey);
    }

    return {
      deletedCount: uniqueObjectKeys.length,
      status: 'deleted' as const,
    };
  }
}
