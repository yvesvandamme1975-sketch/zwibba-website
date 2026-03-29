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

const trailingEnvironmentPatterns = [
  /\s*,\s*pos[ée]?\s+sur\s+[^.]+\.?$/i,
  /\s*,\s*photographi[ée]?\s+sur\s+[^.]+\.?$/i,
  /\s*,\s*avec\s+en\s+arri[èe]re-plan\s+[^.]+\.?$/i,
  /\s*,\s*dans\s+un\s+d[ée]cor\s+[^.]+\.?$/i,
  /\s*,\s*sur\s+une\s+table\s+[^.]+\.?$/i,
  /\s*,\s*sur\s+un\s+bureau\s+[^.]+\.?$/i,
];

const wholeSentenceEnvironmentPatterns = [
  /\b(arri[èe]re-plan|d[ée]cor|environnement)\b/i,
  /\b(onglets?\s+de\s+navigateur|site\s+web|page\s+web)\b/i,
  /\b(table|bureau|mur|sol)\b/i,
];

function ensureTerminalPeriod(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function sanitizeVisionDescription(description: string) {
  const normalizedDescription = normalizeString(description);

  if (!normalizedDescription) {
    return '';
  }

  let sanitizedDescription = normalizedDescription;

  for (const pattern of trailingEnvironmentPatterns) {
    sanitizedDescription = sanitizedDescription.replace(pattern, '');
  }

  const sentenceCandidates = sanitizedDescription
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const keptSentences = sentenceCandidates.filter((sentence) =>
    !wholeSentenceEnvironmentPatterns.some((pattern) => pattern.test(sentence))
  );

  const resolvedDescription =
    keptSentences.join(' ').trim() || sanitizedDescription.trim();

  return ensureTerminalPeriod(resolvedDescription.replace(/\s+,/g, ','));
}

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
    description: sanitizeVisionDescription(normalizeString(candidate.description)),
    title: normalizeString(candidate.title),
  };
}

export function isCompleteVisionDraftPatch(candidate: VisionDraftPatch) {
  return Boolean(
    normalizeString(candidate.title) &&
      normalizeString(candidate.categoryId) &&
      normalizeString(candidate.condition) &&
      normalizeString(candidate.description),
  );
}
