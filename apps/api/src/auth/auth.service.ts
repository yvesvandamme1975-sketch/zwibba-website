import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { loadEnv } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { TwilioVerifyService } from './twilio-verify.service';

type PersistedUserRecord = {
  birthDate?: Date | string | null;
  countryCode?: string | null;
  email?: string | null;
  firstName?: string | null;
  id: string;
  lastName?: string | null;
  locality?: string | null;
  phoneNumber?: string | null;
  postNom?: string | null;
  profileCompletedAt?: Date | null;
};

export type SessionUserRecord = {
  birthDate: string | null;
  countryCode: string | null;
  email: string | null;
  firstName: string | null;
  id: string;
  isProfileComplete: boolean;
  lastName: string | null;
  locality: string | null;
  phoneNumber: string | null;
  postNom: string | null;
};

export type SessionRecord = {
  canSyncDrafts: true;
  phoneNumber: string;
  requiredActions: string[];
  sessionToken: string;
  user: SessionUserRecord;
};

function normalizeBirthDate(value: Date | string | null | undefined) {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return null;
}

function isProfileComplete(user: PersistedUserRecord) {
  return Boolean(
    user.profileCompletedAt &&
    user.email &&
    user.firstName &&
    user.lastName &&
    user.postNom &&
    normalizeBirthDate(user.birthDate) &&
    user.countryCode &&
    user.locality,
  );
}

function toSessionUserRecord(user: PersistedUserRecord): SessionUserRecord {
  return {
    birthDate: normalizeBirthDate(user.birthDate),
    countryCode: user.countryCode ?? null,
    email: user.email ?? null,
    firstName: user.firstName ?? null,
    id: user.id,
    isProfileComplete: isProfileComplete(user),
    lastName: user.lastName ?? null,
    locality: user.locality ?? null,
    phoneNumber: user.phoneNumber ?? null,
    postNom: user.postNom ?? null,
  };
}

@Injectable()
export class AuthService {
  private readonly env = loadEnv();

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(TwilioVerifyService)
    private readonly twilioVerifyService: TwilioVerifyService,
  ) {}

  async requestOtp(phoneNumber: string) {
    const normalizedPhone = phoneNumber.trim();

    if (!normalizedPhone.startsWith('+243')) {
      throw new BadRequestException('Le numéro doit commencer par +243.');
    }

    const verification = await this.twilioVerifyService.requestVerification(
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
    };
  }

  async verifyOtp({
    code,
    phoneNumber,
  }: {
    code: string;
    phoneNumber: string;
  }) {
    const normalizedPhone = phoneNumber.trim();
    const verification = await this.twilioVerifyService.checkVerification({
      code,
      phoneNumber: normalizedPhone,
    });

    if (verification.status != 'approved') {
      throw new UnauthorizedException('Code OTP invalide.');
    }

    const user = await this.prismaService.user.upsert({
      where: {
        phoneNumber: normalizedPhone,
      },
      update: {},
      create: {
        phoneNumber: normalizedPhone,
      },
    });
    await this.prismaService.authIdentity.upsert({
      where: {
        provider_providerSubject: {
          provider: 'phone',
          providerSubject: normalizedPhone,
        },
      },
      update: {
        phoneNumber: normalizedPhone,
        userId: user.id,
        verifiedAt: new Date(),
      },
      create: {
        phoneNumber: normalizedPhone,
        provider: 'phone',
        providerEmail: null,
        providerSubject: normalizedPhone,
        userId: user.id,
        verifiedAt: new Date(),
      },
    });

    await this.seedDemoWalletIfNeeded(user.id);
    const sessionToken = `zwibba_session_${randomUUID().replaceAll('-', '')}`;

    await this.prismaService.session.create({
      data: {
        token: sessionToken,
        userId: user.id,
      },
    });
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

    return this.buildSessionRecord({
      sessionToken,
      user,
    });
  }

  private async seedDemoWalletIfNeeded(userId: string) {
    if (this.env.otp.provider !== 'demo') {
      return;
    }

    const existingTransactionCount = await this.prismaService.walletTransaction.count({
      where: {
        userId,
      },
    });

    if (existingTransactionCount > 0) {
      return;
    }

    await this.prismaService.walletTransaction.create({
      data: {
        amountCdf: 30000,
        createdAtLabel: 'Aujourd’hui',
        kind: 'credit',
        label: 'Crédit bêta Zwibba',
        userId,
      },
    });
  }

  async requireSessionToken(sessionToken: string | undefined) {
    if (!sessionToken) {
      throw new UnauthorizedException('Session manquante.');
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
      throw new UnauthorizedException('Session inconnue.');
    }

    return this.buildSessionRecord({
      sessionToken: session.token,
      user: session.user as PersistedUserRecord,
    });
  }

  private buildSessionRecord({
    sessionToken,
    user,
  }: {
    sessionToken: string;
    user: PersistedUserRecord;
  }): SessionRecord {
    const sessionUser = toSessionUserRecord(user);

    return {
      canSyncDrafts: true as const,
      phoneNumber: sessionUser.phoneNumber ?? '',
      requiredActions: sessionUser.isProfileComplete ? [] : ['complete_profile'],
      sessionToken,
      user: sessionUser,
    };
  }
}
