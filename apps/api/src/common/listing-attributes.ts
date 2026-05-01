import { Prisma } from '@prisma/client';

export type ListingAttributesJson = Record<string, unknown> | null;

export function normalizeListingAttributesJson(value: unknown): ListingAttributesJson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function toPrismaListingAttributesJson(value: unknown) {
  const normalizedAttributes = normalizeListingAttributesJson(value);

  return normalizedAttributes
    ? (normalizedAttributes as Prisma.InputJsonValue)
    : Prisma.DbNull;
}
