import type { GoogleVisionSignals } from './google-vision-signals';
import type { VisionDraftPatch } from './vision-draft-provider';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function buildSignalHaystack({
  draftPatch,
  signals,
}: {
  draftPatch: VisionDraftPatch;
  signals: GoogleVisionSignals;
}) {
  return normalizeText([
    draftPatch.title,
    draftPatch.description,
    signals.ocrText,
    ...signals.labels,
    ...signals.logos,
    ...signals.objects,
  ].join(' '));
}

function hasAnyPattern(haystack: string, patterns: string[]) {
  return patterns.some((pattern) => haystack.includes(pattern));
}

function hasStrongRecruitmentSignal(haystack: string) {
  return hasAnyPattern(haystack, [
    "offre d'emploi",
    'recrutement',
    'poste',
    'hiring',
    'job posting',
  ]);
}

function hasStrongServiceSignal(haystack: string) {
  return hasAnyPattern(haystack, [
    'plumbing',
    'plomberie',
    'mecanicien',
    'mechanic',
    'repair',
    'coiffure',
    'garage',
    'service',
    'сервис',
    'business card',
    'carte professionnelle',
  ]);
}

function hasStrongMusicSignal(haystack: string) {
  return hasAnyPattern(haystack, [
    'guitare',
    'piano',
    'clavier musical',
    'musical keyboard',
    'batterie',
    'ampli instrument',
    'micro studio',
  ]);
}

function hasStrongConstructionSignal(haystack: string) {
  return hasAnyPattern(haystack, [
    'ciment',
    'beton',
    'brique',
    'perceuse',
    'disqueuse',
    'chantier',
    'power tool',
    'drill',
  ]);
}

function hasStrongBeautySignal(haystack: string) {
  return hasAnyPattern(haystack, [
    'maquillage',
    'parfum',
    'coiffure',
    'onglerie',
    'salon beaute',
    'rouge a levres',
    'lipstick',
    'cosmetics',
  ]);
}

function hasStrongHealthSignal(haystack: string) {
  return hasAnyPattern(haystack, [
    'pharmacie',
    'complement',
    'tensiometre',
    'thermometre',
    'medical',
    'medical equipment',
    'soin medical',
    'bandage',
  ]);
}

function hasStrongFoodSignal(haystack: string) {
  return hasAnyPattern(haystack, [
    'farine',
    'huile',
    'riz',
    'food product',
    'aliment',
    'epice',
    'epices',
    'boisson',
    'jus',
  ]);
}

function hasStrongAgricultureSignal(haystack: string) {
  return hasAnyPattern(haystack, [
    'agricole',
    'agriculture',
    'pulverisateur',
    'sprayer',
    'semence',
    'semences',
    'recolte',
    'machette',
  ]);
}

function hasStrongEducationSignal(haystack: string) {
  return hasAnyPattern(haystack, [
    'fournitures scolaires',
    'fournitures de bureau',
    'school supplies',
    'ecole',
    'papeterie',
    'scolaire',
    'universite',
    'cours',
    'cahier',
    'cahiers',
    'notebook',
    'livre',
    'livres',
    'calculatrice',
    'crayon',
    'crayons',
    'carnet',
    'carnets',
  ]);
}

export function disambiguateVisionCategory({
  draftPatch,
  signals,
}: {
  draftPatch: VisionDraftPatch;
  signals: GoogleVisionSignals;
}): VisionDraftPatch {
  const haystack = buildSignalHaystack({
    draftPatch,
    signals,
  });

  if (!haystack) {
    return draftPatch;
  }

  if (hasStrongRecruitmentSignal(haystack)) {
    return {
      ...draftPatch,
      categoryId: 'emploi',
    };
  }

  if (hasStrongServiceSignal(haystack) && draftPatch.categoryId !== 'emploi') {
    return {
      ...draftPatch,
      categoryId: 'services',
    };
  }

  if (hasStrongMusicSignal(haystack)) {
    return {
      ...draftPatch,
      categoryId: 'music',
    };
  }

  if (hasStrongConstructionSignal(haystack)) {
    return {
      ...draftPatch,
      categoryId: 'construction',
    };
  }

  if (hasStrongFoodSignal(haystack) && !hasStrongAgricultureSignal(haystack)) {
    return {
      ...draftPatch,
      categoryId: 'food',
    };
  }

  if (hasStrongAgricultureSignal(haystack) && !hasStrongFoodSignal(haystack)) {
    return {
      ...draftPatch,
      categoryId: 'agriculture',
    };
  }

  if (hasStrongEducationSignal(haystack)) {
    return {
      ...draftPatch,
      categoryId: 'education',
    };
  }

  if (hasStrongBeautySignal(haystack) && !hasStrongHealthSignal(haystack)) {
    return {
      ...draftPatch,
      categoryId: 'beauty',
    };
  }

  if (hasStrongHealthSignal(haystack) && !hasStrongBeautySignal(haystack)) {
    return {
      ...draftPatch,
      categoryId: 'health',
    };
  }

  return draftPatch;
}
