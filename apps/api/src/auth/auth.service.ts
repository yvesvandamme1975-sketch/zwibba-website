import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

type SessionRecord = {
  canSyncDrafts: true;
  phoneNumber: string;
  sessionToken: string;
};

@Injectable()
export class AuthService {
  private readonly pendingPhones = new Set<string>();
  private readonly sessions = new Map<string, SessionRecord>();

  requestOtp(phoneNumber: string) {
    const normalizedPhone = phoneNumber.trim();

    if (!normalizedPhone.startsWith('+243')) {
      throw new BadRequestException('Le numéro doit commencer par +243.');
    }

    this.pendingPhones.add(normalizedPhone);

    return {
      challengeId: `otp_${normalizedPhone.replaceAll('+', '').replaceAll(' ', '')}`,
      expiresInSeconds: 300,
      phoneNumber: normalizedPhone,
    };
  }

  verifyOtp({
    code,
    phoneNumber,
  }: {
    code: string;
    phoneNumber: string;
  }) {
    const normalizedPhone = phoneNumber.trim();

    if (!this.pendingPhones.has(normalizedPhone)) {
      throw new UnauthorizedException('Aucun challenge OTP actif.');
    }

    if (code.trim() != '123456') {
      throw new UnauthorizedException('Code OTP invalide.');
    }

    const session = {
      canSyncDrafts: true as const,
      phoneNumber: normalizedPhone,
      sessionToken: `zwibba_session_${normalizedPhone.replaceAll('+', '').replaceAll(' ', '')}`,
    };

    this.pendingPhones.delete(normalizedPhone);
    this.sessions.set(session.sessionToken, session);

    return session;
  }

  requireSessionToken(sessionToken: string | undefined) {
    if (!sessionToken) {
      throw new UnauthorizedException('Session manquante.');
    }

    const session = this.sessions.get(sessionToken);

    if (!session) {
      throw new UnauthorizedException('Session inconnue.');
    }

    return session;
  }
}
