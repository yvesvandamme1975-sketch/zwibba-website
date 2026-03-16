import { Inject, Injectable } from '@nestjs/common';

import { DraftsService } from '../drafts/drafts.service';

export type ModerationStatus =
  | 'approved'
  | 'blocked_needs_fix'
  | 'pending_manual_review';

export type ModerationQueueItem = {
  id: string;
  listingTitle: string;
  reasonSummary: string;
  sellerPhoneNumber: string;
  status: ModerationStatus;
};

export type PublishOutcome = {
  id: string;
  reasonSummary: string;
  shareUrl: string;
  status: ModerationStatus;
  statusLabel: string;
};

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DraftsService) private readonly draftsService: DraftsService,
  ) {}

  private readonly queueItems = new Map<string, ModerationQueueItem>();

  async publish({
    categoryId,
    description,
    draftId,
    ownerPhoneNumber,
    priceCdf,
    title,
  }: {
    categoryId: string;
    description: string;
    draftId: string;
    ownerPhoneNumber: string;
    priceCdf: number;
    title: string;
  }): Promise<PublishOutcome> {
    const syncedDraft = await this.draftsService.getSyncedDraft(draftId);
    const normalizedDescription = description.trim();

    if (
      !syncedDraft ||
      syncedDraft.ownerPhoneNumber !== ownerPhoneNumber ||
      title.trim().length === 0 ||
      priceCdf <= 0 ||
      normalizedDescription.length === 0
    ) {
      this.queueItems.delete(draftId);

      return {
        id: draftId,
        reasonSummary: 'La description du produit doit être complétée avant publication.',
        shareUrl: '',
        status: 'blocked_needs_fix',
        statusLabel: 'Annonce bloquée: informations à corriger',
      };
    }

    if (categoryId === 'vehicles' || categoryId === 'real_estate') {
      const queueItem = {
        id: draftId,
        listingTitle: title,
        reasonSummary: 'Documents ou photo principale à vérifier avant mise en ligne.',
        sellerPhoneNumber: ownerPhoneNumber,
        status: 'pending_manual_review' as const,
      };

      this.queueItems.set(queueItem.id, queueItem);

      return {
        id: draftId,
        reasonSummary: 'Votre annonce a été envoyée en revue manuelle.',
        shareUrl: '',
        status: 'pending_manual_review',
        statusLabel: 'Annonce envoyée en revue manuelle',
      };
    }

    this.queueItems.delete(draftId);

    return {
      id: draftId,
      reasonSummary: 'Annonce approuvée et prête à partager.',
      shareUrl: `https://zwibba.com/annonces/${draftId}`,
      status: 'approved',
      statusLabel: 'Annonce approuvée et prête à partager',
    };
  }

  listQueue() {
    return {
      items: Array.from(this.queueItems.values()),
    };
  }
}
