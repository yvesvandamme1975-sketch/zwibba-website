import { Injectable } from '@nestjs/common';

export type SyncedDraftRecord = {
  area: string;
  categoryId: string;
  draftId: string;
  ownerPhoneNumber: string;
  priceCdf: number;
  syncStatus: 'synced';
  title: string;
};

@Injectable()
export class DraftsService {
  private readonly syncedDrafts = new Map<string, SyncedDraftRecord>();

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
    const syncedDraft = {
      area,
      categoryId,
      draftId: `draft_${slugBase || 'zwibba'}`,
      ownerPhoneNumber: phoneNumber,
      priceCdf,
      syncStatus: 'synced' as const,
      title,
    };

    this.syncedDrafts.set(syncedDraft.draftId, syncedDraft);

    return syncedDraft;
  }

  getSyncedDraft(draftId: string) {
    return this.syncedDrafts.get(draftId);
  }
}
