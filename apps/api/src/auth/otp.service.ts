import {
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';

import { loadEnv } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { generateOtpCode, hashOtpCode, verifyOtpCode } from './otp-code';
import { WHATSAPP_OTP_ENV, WhatsappOtpSender } from './whatsapp-otp.sender';

type OtpVerificationResponse = {
  sid: string;
  status: string;
};

type OtpServiceEnv = {
  otp: {
    demoAllowlist: string[];
    demoCode?: string;
    provider: 'demo' | 'meta' | 'twilio';
  };
};

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  private readonly env: OtpServiceEnv;

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(WhatsappOtpSender)
    private readonly whatsappOtpSender: WhatsappOtpSender,
    @Optional()
    @Inject(WHATSAPP_OTP_ENV)
    env?: OtpServiceEnv,
  ) {
    this.env = env ?? (loadEnv() as unknown as OtpServiceEnv);
  }

  async checkVerification({
    code,
    phoneNumber,
  }: {
    code: string;
    phoneNumber: string;
  }): Promise<OtpVerificationResponse> {
    if (this.env.otp.provider === 'demo') {
      if (!this.env.otp.demoAllowlist.includes(phoneNumber)) {
        throw new ForbiddenException('Numéro non autorisé pour le mode demo.');
      }
    }

    const challenge = await this.prismaService.otpChallenge.findFirst({
      where: {
        consumedAt: null,
        phoneNumber,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!challenge) {
      return {
        sid: '',
        status: 'pending',
      };
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.prismaService.otpChallenge.update({
        data: {
          consumedAt: new Date(),
        },
        where: {
          id: challenge.id,
        },
      });

      return {
        sid: challenge.id,
        status: 'expired',
      };
    }

    const nextAttemptCount = challenge.attemptCount + 1;
    const isApproved = verifyOtpCode(code, challenge.codeHash);
    const shouldConsume = isApproved || nextAttemptCount >= OTP_MAX_ATTEMPTS;

    await this.prismaService.otpChallenge.update({
      data: {
        attemptCount: nextAttemptCount,
        consumedAt: shouldConsume ? new Date() : null,
      },
      where: {
        id: challenge.id,
      },
    });

    return {
      sid: challenge.id,
      status: isApproved ? 'approved' : 'pending',
    };
  }

  async requestVerification(
    phoneNumber: string,
  ): Promise<OtpVerificationResponse> {
    const code = this.env.otp.provider === 'demo'
      ? this.env.otp.demoCode
      : generateOtpCode();

    if (this.env.otp.provider === 'demo') {
      if (!this.env.otp.demoAllowlist.includes(phoneNumber)) {
        throw new ForbiddenException('Numéro non autorisé pour le mode demo.');
      }

      if (!code) {
        throw new ForbiddenException('Code demo OTP manquant.');
      }
    }

    await this.prismaService.otpChallenge.updateMany({
      data: {
        consumedAt: new Date(),
      },
      where: {
        consumedAt: null,
        phoneNumber,
      },
    });

    const challenge = await this.prismaService.otpChallenge.create({
      data: {
        codeHash: hashOtpCode(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        phoneNumber,
      },
    });

    if (this.env.otp.provider === 'meta') {
      await this.whatsappOtpSender.sendAuthenticationCode({
        code,
        phoneNumber,
      });
    }

    return {
      sid: challenge.id,
      status: 'pending',
    };
  }
}
