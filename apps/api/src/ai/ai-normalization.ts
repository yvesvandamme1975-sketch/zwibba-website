import {
  defaultCategoryId,
  defaultCondition,
  supportedCategoryIds,
  supportedConditionValues,
} from './ai-taxonomy';
import type { VisionDraftPatch } from './vision-draft-provider';

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

const supportedCategoryIdSet = new Set(supportedCategoryIds);
const supportedConditionSet = new Set(supportedConditionValues);

export function normalizeVisionDraftPatch(candidate: Record<string, unknown>): VisionDraftPatch {
  const categoryId = normalizeString(candidate.categoryId);
  const condition = normalizeString(candidate.condition);

  return {
    categoryId: supportedCategoryIdSet.has(categoryId as (typeof supportedCategoryIds)[number])
      ? categoryId
      : defaultCategoryId,
    condition: supportedConditionSet.has(condition as (typeof supportedConditionValues)[number])
      ? condition
      : defaultCondition,
    description: normalizeString(candidate.description),
    title: normalizeString(candidate.title),
  };
}
