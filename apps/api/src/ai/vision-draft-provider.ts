export type VisionDraftRequest = {
  contentType?: string;
  objectKey?: string;
  photoUrl: string;
};

export type VisionDraftPatch = {
  categoryId: string;
  condition: string;
  description: string;
  itemType?: string;
  size?: string;
  title: string;
};

export interface VisionDraftProvider {
  generateDraftFromImage(input: VisionDraftRequest): Promise<VisionDraftPatch>;
}

export const VISION_DRAFT_PROVIDER = Symbol('VISION_DRAFT_PROVIDER');
