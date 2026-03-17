import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { loadEnv } from '../config/env';

type TwilioVerificationResponse = {
  sid: string;
  status: string;
};

@Injectable()
export class TwilioVerifyService {
  private readonly env = loadEnv();

  async checkVerification({
    code,
    phoneNumber,
  }: {
    code: string;
    phoneNumber: string;
  }): Promise<TwilioVerificationResponse> {
    if (this.env.otp.provider === 'demo') {
      if (!this.env.otp.demoAllowlist.includes(phoneNumber)) {
        throw new ForbiddenException('Numéro non autorisé pour le mode demo.');
      }

      return {
        sid: `DEMO${phoneNumber.replaceAll('+', '')}`,
        status: code === this.env.otp.demoCode ? 'approved' : 'pending',
      };
    }

    const body = new URLSearchParams({
      Code: code,
      To: phoneNumber,
    });
    const twilio = this.env.twilio;

    if (!twilio) {
      throw new UnauthorizedException('Twilio Verify n’est pas configuré.');
    }

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${twilio.verifyServiceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          authorization: this.buildAuthorizationHeader(),
          'content-type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!response.ok) {
      throw new UnauthorizedException('Code OTP invalide.');
    }

    const json = (await response.json()) as {
      sid: string;
      status: string;
    };

    return {
      sid: json.sid,
      status: json.status,
    };
  }

  async requestVerification(
    phoneNumber: string,
  ): Promise<TwilioVerificationResponse> {
    if (this.env.otp.provider === 'demo') {
      if (!this.env.otp.demoAllowlist.includes(phoneNumber)) {
        throw new ForbiddenException('Numéro non autorisé pour le mode demo.');
      }

      return {
        sid: `DEMO${phoneNumber.replaceAll('+', '')}`,
        status: 'pending',
      };
    }

    const body = new URLSearchParams({
      Channel: 'sms',
      To: phoneNumber,
    });
    const twilio = this.env.twilio;

    if (!twilio) {
      throw new UnauthorizedException('Twilio Verify n’est pas configuré.');
    }

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${twilio.verifyServiceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          authorization: this.buildAuthorizationHeader(),
          'content-type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!response.ok) {
      throw new UnauthorizedException('Impossible d’envoyer le code OTP.');
    }

    const json = (await response.json()) as {
      sid: string;
      status: string;
    };

    return {
      sid: json.sid,
      status: json.status,
    };
  }

  private buildAuthorizationHeader() {
    const twilio = this.env.twilio;

    if (!twilio) {
      throw new UnauthorizedException('Twilio Verify n’est pas configuré.');
    }

    const credentials = Buffer.from(
      `${twilio.accountSid}:${twilio.authToken}`,
    ).toString('base64');

    return `Basic ${credentials}`;
  }
}
