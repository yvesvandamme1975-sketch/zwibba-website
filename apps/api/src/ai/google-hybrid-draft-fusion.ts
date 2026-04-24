import { defaultCategoryId } from './ai-taxonomy';
import type { GoogleVisionSignals } from './google-vision-signals';
import type { VisionDraftPatch } from './vision-draft-provider';

const googleVisionEnrichmentCategoryIds = new Set([
  'services',
  'emploi',
  'education',
  'construction',
  'food',
]);

const genericDraftTitles = new Set([
  'annonce préparée par ia',
  'annonce preparee par ia',
]);

const signalCategoryMatchers = [
  {
    categoryId: 'services',
    patterns: ['plomberie', 'service', 'réparation', 'reparation', 'coiffure', 'garage'],
  },
  {
    categoryId: 'emploi',
    patterns: ['recrutement', 'emploi', 'poste', 'hiring'],
  },
  {
    categoryId: 'education',
    patterns: ['école', 'ecole', 'université', 'universite', 'scolaire', 'cours'],
  },
  {
    categoryId: 'construction',
    patterns: ['ciment', 'chantier', 'béton', 'beton', 'brique'],
  },
  {
    categoryId: 'food',
    patterns: ['aliment', 'mangue', 'avocat', 'riz', 'farine', 'huile'],
  },
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function inferCategoryFromSignals(signals: GoogleVisionSignals) {
  const haystack = normalizeText([
    signals.ocrText,
    ...signals.labels,
    ...signals.logos,
    ...signals.objects,
  ].join(' '));

  if (!haystack) {
    return undefined;
  }

  for (const matcher of signalCategoryMatchers) {
    if (matcher.patterns.some((pattern) => haystack.includes(pattern))) {
      return matcher.categoryId;
    }
  }

  return undefined;
}

function isGenericTitle(title: string) {
  return genericDraftTitles.has(normalizeText(title));
}

function firstUsefulOcrLine(ocrText: string) {
  return ocrText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length >= 3)
    .find((line) => !/\+?\d[\d\s().-]{5,}/.test(line));
}

function shouldUseGoogleVisionCategory({
  currentCategoryId,
  inferredCategoryId,
}: {
  currentCategoryId: string;
  inferredCategoryId?: string;
}) {
  if (!inferredCategoryId || !googleVisionEnrichmentCategoryIds.has(inferredCategoryId)) {
    return false;
  }

  return currentCategoryId === defaultCategoryId || currentCategoryId === inferredCategoryId;
}

function refineTitle({
  categoryId,
  currentTitle,
  signals,
}: {
  categoryId: string;
  currentTitle: string;
  signals: GoogleVisionSignals;
}) {
  if (!googleVisionEnrichmentCategoryIds.has(categoryId) || !isGenericTitle(currentTitle)) {
    return currentTitle;
  }

  return firstUsefulOcrLine(signals.ocrText) || signals.logos[0] || currentTitle;
}

export function fuseGoogleVisionSignalsIntoDraft({
  draftPatch,
  signals,
}: {
  draftPatch: VisionDraftPatch;
  signals: GoogleVisionSignals;
}): VisionDraftPatch {
  const inferredCategoryId = inferCategoryFromSignals(signals);
  const categoryId = shouldUseGoogleVisionCategory({
    currentCategoryId: draftPatch.categoryId,
    inferredCategoryId,
  })
    ? inferredCategoryId!
    : draftPatch.categoryId;

  return {
    ...draftPatch,
    categoryId,
    title: refineTitle({
      categoryId,
      currentTitle: draftPatch.title,
      signals,
    }),
  };
}

export function isGoogleVisionFusionCategory(categoryId: string) {
  return googleVisionEnrichmentCategoryIds.has(categoryId);
}
