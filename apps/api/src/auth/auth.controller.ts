import { Body, Controller, Get, Headers, Inject, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import type { TermsAcceptanceInput } from './legal-policy';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get('legal-documents')
  legalDocuments() { return this.authService.getLegalDocuments(); }

  @Get('legal-status')
  legalStatus(@Headers('authorization') authorization?: string) {
    return this.authService.getLegalStatus(authorization?.replace(/^Bearer\s+/i, '').trim());
  }

  @Post('accept-terms')
  acceptTerms(@Headers('authorization') authorization: string | undefined, @Body() body: TermsAcceptanceInput) {
    return this.authService.acceptTerms(authorization?.replace(/^Bearer\s+/i, '').trim(), body);
  }

  @Post('request-otp')
  async requestOtp(@Body() body: { phoneNumber?: string }) {
    return this.authService.requestOtp(body.phoneNumber ?? '');
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body()
    body: {
      code?: string;
      phoneNumber?: string;
      legalAcceptance?: TermsAcceptanceInput;
    },
  ) {
    return this.authService.verifyOtp({
      code: body.code ?? '',
      phoneNumber: body.phoneNumber ?? '',
      legalAcceptance: body.legalAcceptance,
    });
  }
}
