import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../database/prisma.service';
import { TwilioVerifyService } from './twilio-verify.service';

export type SessionRecord = {
  canSyncDrafts: true;
  phoneNumber: string;
  sessionToken: string;
};

@Injectable()
export class AuthService {
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

    const session = {
      canSyncDrafts: true as const,
      phoneNumber: normalizedPhone,
      sessionToken,
    };

    return session;
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

    return {
      canSyncDrafts: true as const,
      phoneNumber: session.user.phoneNumber,
      sessionToken: session.token,
    };
  }
}
