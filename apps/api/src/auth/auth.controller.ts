import { Body, Controller, Inject, Post } from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('request-otp')
  requestOtp(@Body() body: { phoneNumber?: string }) {
    return this.authService.requestOtp(body.phoneNumber ?? '');
  }

  @Post('verify-otp')
  verifyOtp(
    @Body()
    body: {
      code?: string;
      phoneNumber?: string;
    },
  ) {
    return this.authService.verifyOtp({
      code: body.code ?? '',
      phoneNumber: body.phoneNumber ?? '',
    });
  }
}
