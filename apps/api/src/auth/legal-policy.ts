import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { LegalDocument, LegalPolicy } from '../../assets/legal/catalog.mjs';
import { resolvePhoneCountry } from './phone-country';

export const LEGAL_POLICY = 'ZWIBBA_LEGAL_POLICY';
export type TermsAcceptanceInput = { accepted?: boolean; version?: string; hash?: string; locale?: string };

export function requiredTerms(policy: LegalPolicy, phoneNumber: string, locale?: string): LegalDocument | null {
  const market = resolvePhoneCountry(phoneNumber);
  if (!market) throw new BadRequestException('Le numéro doit commencer par +243 ou +32.');
  try { return policy.termsFor(market, locale); }
  catch { throw new BadRequestException('La langue des conditions ne correspond pas à votre marché.'); }
}

export function validateTermsAcceptance(terms: LegalDocument | null, input?: TermsAcceptanceInput) {
  if (!terms) return;
  if (input?.accepted !== true) throw new BadRequestException({
    code: 'TERMS_ACCEPTANCE_REQUIRED',
    message: 'Veuillez lire et accepter les conditions générales d’utilisation (CGU).',
  });
  if (input.version !== terms.version || input.hash !== terms.hash || input.locale !== terms.locale) {
    throw new ConflictException('La version des conditions a changé. Rechargez-la avant de continuer.');
  }
}

export async function recordTermsAcceptance(db: Pick<Prisma.TransactionClient, 'termsAcceptance'>, userId: string, terms: LegalDocument) {
  const key = { userId, version: terms.version, documentHash: terms.hash, locale: terms.locale, market: terms.market };
  // Empty update preserves the first acceptance timestamp and exact text.
  return db.termsAcceptance.upsert({ where: { userId_version_documentHash_locale_market: key },
    create: { ...key, documentText: terms.content }, update: {} });
}
