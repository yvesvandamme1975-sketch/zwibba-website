import { BadRequestException } from '@nestjs/common';

export const MAX_DISPLAY_NAME_LENGTH = 40;

const RESERVED_DISPLAY_NAME_TERMS = [
  'admin',
  'officiel',
  'support',
  'zwibba',
];

const PROFANITY_DISPLAY_NAME_TERMS = [
  'con',
  'merde',
];

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function normalizeDisplayName(raw: string) {
  const displayName = raw.trim();

  if (!displayName) {
    throw new BadRequestException('Choisissez un nom vendeur.');
  }

  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new BadRequestException(
      `Le nom vendeur doit contenir ${MAX_DISPLAY_NAME_LENGTH} caractères maximum.`,
    );
  }

  const searchableName = normalizeSearchText(displayName);

  if (RESERVED_DISPLAY_NAME_TERMS.some((term) => searchableName.includes(term))) {
    throw new BadRequestException('Ce nom vendeur est réservé.');
  }

  if (PROFANITY_DISPLAY_NAME_TERMS.some((term) => searchableName.includes(term))) {
    throw new BadRequestException('Choisissez un nom vendeur approprié.');
  }

  return displayName;
}
