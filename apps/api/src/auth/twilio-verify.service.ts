import { Injectable, UnauthorizedException } from '@nestjs/common';

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
    const body = new URLSearchParams({
      Code: code,
      To: phoneNumber,
    });

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${this.env.twilio.verifyServiceSid}/VerificationCheck`,
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
    const body = new URLSearchParams({
      Channel: 'sms',
      To: phoneNumber,
    });

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${this.env.twilio.verifyServiceSid}/Verifications`,
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
    const credentials = Buffer.from(
      `${this.env.twilio.accountSid}:${this.env.twilio.authToken}`,
    ).toString('base64');

    return `Basic ${credentials}`;
  }
}
