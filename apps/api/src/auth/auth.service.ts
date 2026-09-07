import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { loadLegalCatalog, type LegalDocument, type LegalPolicy } from '../../assets/legal/catalog.mjs';
import { LEGAL_POLICY, requiredTerms, validateTermsAcceptance, recordTermsAcceptance, type TermsAcceptanceInput } from './legal-policy';

import { loadEnv } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { OtpService } from './otp.service';
import { resolvePhoneCountry } from './phone-country';
import { computeSessionExpiry, isSessionExpired } from './session-expiry';
import { isOtpRequestRateExceeded, resolveOtpRateWindowStart } from './otp-rate-limit';

export type SessionRecord = {
  canSyncDrafts: true;
  phoneNumber: string;
  sessionToken: string;
};

@Injectable()
export class AuthService {
  private readonly env = loadEnv();

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(OtpService)
    private readonly otpService: OtpService,
    @Optional() @Inject(LEGAL_POLICY) private readonly legalPolicy: LegalPolicy = loadLegalCatalog(),
  ) {}

  async requestOtp(phoneNumber: string) {
    const normalizedPhone = phoneNumber.trim();

    if (!resolvePhoneCountry(normalizedPhone)) {
      throw new BadRequestException('Le numéro doit commencer par +243 ou +32.');
    }

    const recentAttemptCount = await this.prismaService.verificationAttempt.count({
      where: {
        phoneNumber: normalizedPhone,
        createdAt: { gte: resolveOtpRateWindowStart() },
      },
    });

    if (isOtpRequestRateExceeded(recentAttemptCount)) {
      throw new HttpException(
        'Trop de demandes de code pour ce numéro. Réessayez dans quelques minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const verification = await this.otpService.requestVerification(
      normalizedPhone,
    );
    await this.prismaService.verificationAttempt.create({
      data: {
        challengeId: verification.sid,
        phoneNumber: normalizedPhone,
        status: verification.status,
      },
    });

    return {
      challengeId: verification.sid,
      expiresInSeconds: 300,
      phoneNumber: normalizedPhone,
      ...(this.legalPolicy.active ? { legal: this.legalRequirement(normalizedPhone) } : {}),
    };
  }

  async verifyOtp({
    code,
    phoneNumber,
    legalAcceptance,
  }: {
    code: string;
    phoneNumber: string;
    legalAcceptance?: TermsAcceptanceInput;
  }) {
    const normalizedPhone = phoneNumber.trim();
    const terms = requiredTerms(this.legalPolicy, normalizedPhone, legalAcceptance?.locale);
    validateTermsAcceptance(terms, legalAcceptance);
    const verification = await this.otpService.checkVerification({
      code,
      phoneNumber: normalizedPhone,
    });

    if (verification.status != 'approved') {
      throw new UnauthorizedException('Code OTP invalide.');
    }

    const phoneCountry = resolvePhoneCountry(normalizedPhone)!;
    const sessionToken = `zwibba_session_${randomUUID().replaceAll('-', '')}`;
    const issueSession = async (db: Prisma.TransactionClient) => {
      const user = await db.user.upsert({
        where: { phoneNumber: normalizedPhone }, update: { countryCode: phoneCountry },
        create: { phoneNumber: normalizedPhone, countryCode: phoneCountry },
      });
      if (terms) await recordTermsAcceptance(db, user.id, terms);
      await db.session.create({ data: { token: sessionToken, userId: user.id, expiresAt: computeSessionExpiry() } });
      return user;
    };
    // Real, active contract acceptance must commit with account and session.
    // Inactive drafts preserve the established login path and create no evidence.
    const user = terms
      ? await this.prismaService.$transaction(issueSession)
      : await issueSession(this.prismaService);
    await this.seedDemoWalletIfNeeded(user.id);
    await this.prismaService.verificationAttempt.updateMany({
      where: {
        phoneNumber: normalizedPhone,
        status: 'pending',
      },
      data: {
        challengeId: verification.sid,
        status: 'approved',
      },
    });

    const session = {
      canSyncDrafts: true as const,
      phoneNumber: normalizedPhone,
      sessionToken,
    };

    return session;
  }

  private async seedDemoWalletIfNeeded(userId: string) {
    if (this.env.otp.provider !== 'demo') {
      return;
    }

    const walletTransactionDelegate = this.prismaService.walletTransaction;
    if (
      !walletTransactionDelegate ||
      typeof walletTransactionDelegate.count !== 'function' ||
      typeof walletTransactionDelegate.create !== 'function'
    ) {
      return;
    }

    const existingTransactionCount = await walletTransactionDelegate.count({
      where: {
        userId,
      },
    });

    if (existingTransactionCount > 0) {
      return;
    }

    await walletTransactionDelegate.create({
      data: {
        amountCdf: 30000,
        createdAtLabel: 'Aujourd’hui',
        kind: 'credit',
        label: 'Crédit bêta Zwibba',
        userId,
      },
    });
  }

  async requireSessionToken(sessionToken: string | undefined, { skipTerms = false } = {}) {
    const session = await this.findSessionToken(sessionToken);

    if (!sessionToken) {
      throw new UnauthorizedException('Session manquante.');
    }

    if (!session) {
      throw new UnauthorizedException('Session inconnue.');
    }

    if (!skipTerms && this.legalPolicy.active) {
      const status = await this.legalStatusForSession(session);
      if (status.needsAcceptance) throw new HttpException({ code: 'TERMS_ACCEPTANCE_REQUIRED', message: 'Veuillez accepter la nouvelle version des CGU pour continuer avec votre compte.' }, 428);
    }
    return session;
  }

  private publicDocument(document: LegalDocument) {
    const { content, path, ...metadata } = document;
    return { ...metadata, url: new URL(path, this.env.appBaseUrl).href };
  }

  getLegalDocuments() {
    return { active: this.legalPolicy.active, documents: this.legalPolicy.documents.map(doc => this.publicDocument(doc)) };
  }

  private legalRequirement(phoneNumber: string, locale?: string) {
    const terms = requiredTerms(this.legalPolicy, phoneNumber, locale);
    return terms ? { required: true, terms: this.publicDocument(terms),
      documents: this.legalPolicy.documents.filter(doc => doc.market === terms.market).map(doc => this.publicDocument(doc)) } : null;
  }

  private async legalStatusForSession(session: SessionRecord) {
    if (!this.legalPolicy.active) return { active: false, needsAcceptance: false, terms: null, documents: [] };
    const market = resolvePhoneCountry(session.phoneNumber)!;
    const user = await this.prismaService.user.findUnique({ where: { phoneNumber: session.phoneNumber } });
    if (!user) throw new UnauthorizedException('Compte introuvable.');
    const accepted = await this.prismaService.termsAcceptance.findFirst({ where: {
      userId: user.id, market, version: this.legalPolicy.version,
      OR: this.legalPolicy.documents.filter(doc => doc.kind === 'terms' && doc.market === market)
        .map(doc => ({ documentHash: doc.hash, locale: doc.locale })),
    } });
    return { active: true, needsAcceptance: !accepted, ...this.legalRequirement(session.phoneNumber) };
  }

  async getLegalStatus(sessionToken: string | undefined) {
    const session = await this.requireSessionToken(sessionToken, { skipTerms: true });
    return this.legalStatusForSession(session);
  }

  async acceptTerms(sessionToken: string | undefined, input?: TermsAcceptanceInput) {
    const session = await this.requireSessionToken(sessionToken, { skipTerms: true });
    const terms = requiredTerms(this.legalPolicy, session.phoneNumber, input?.locale);
    if (!terms) throw new BadRequestException('Aucune version des CGU publiée à accepter.');
    validateTermsAcceptance(terms, input);
    await this.prismaService.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { phoneNumber: session.phoneNumber } });
      if (!user) throw new UnauthorizedException('Compte introuvable.');
      await recordTermsAcceptance(tx, user.id, terms);
    });
    return this.legalStatusForSession(session);
  }

  async findSessionToken(sessionToken: string | undefined) {
    if (!sessionToken) {
      return null;
    }

    const session = await this.prismaService.session.findUnique({
      where: {
        token: sessionToken,
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      return null;
    }

    if (isSessionExpired(session)) {
      return null;
    }

    return {
      canSyncDrafts: true as const,
      phoneNumber: session.user.phoneNumber,
      sessionToken: session.token,
    };
  }
}
