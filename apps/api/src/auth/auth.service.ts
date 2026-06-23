import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { loadEnv } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { OtpService } from './otp.service';
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
  ) {}

  async requestOtp(phoneNumber: string) {
    const normalizedPhone = phoneNumber.trim();

    if (!normalizedPhone.startsWith('+243')) {
      throw new BadRequestException('Le numéro doit commencer par +243.');
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
    const verification = await this.otpService.checkVerification({
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

    await this.seedDemoWalletIfNeeded(user.id);
    const sessionToken = `zwibba_session_${randomUUID().replaceAll('-', '')}`;

    await this.prismaService.session.create({
      data: {
        token: sessionToken,
        userId: user.id,
        expiresAt: computeSessionExpiry(),
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

  async requireSessionToken(sessionToken: string | undefined) {
    const session = await this.findSessionToken(sessionToken);

    if (!sessionToken) {
      throw new UnauthorizedException('Session manquante.');
    }

    if (!session) {
      throw new UnauthorizedException('Session inconnue.');
    }

    return session;
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
