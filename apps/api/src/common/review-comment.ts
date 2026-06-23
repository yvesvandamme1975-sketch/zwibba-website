import { BadRequestException } from '@nestjs/common';

export const MAX_REVIEW_COMMENT_LENGTH = 280;

const PROFANITY_REVIEW_COMMENT_TERMS = [
  'con',
  'merde',
];

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function normalizeReviewComment(raw?: string | null) {
  const comment = raw?.trim() ?? '';

  if (!comment) {
    return null;
  }

  if (comment.length > MAX_REVIEW_COMMENT_LENGTH) {
    throw new BadRequestException(
      `Le commentaire doit contenir ${MAX_REVIEW_COMMENT_LENGTH} caractères maximum.`,
    );
  }

  const searchableWords = normalizeSearchText(comment)
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);

  if (PROFANITY_REVIEW_COMMENT_TERMS.some((term) => searchableWords.includes(term))) {
    throw new BadRequestException('Choisissez un avis approprié.');
  }

  return comment;
}
