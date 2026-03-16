import { Injectable } from '@nestjs/common';

@Injectable()
export class DraftsService {
  syncDraft({
    area,
    categoryId,
    phoneNumber,
    priceCdf,
    title,
  }: {
    area: string;
    categoryId: string;
    phoneNumber: string;
    priceCdf: number;
    title: string;
  }) {
    const slugBase = title.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-+|-+$/g, '');

    return {
      area,
      categoryId,
      draftId: `draft_${slugBase || 'zwibba'}`,
      ownerPhoneNumber: phoneNumber,
      priceCdf,
      syncStatus: 'synced',
      title,
    };
  }
}
