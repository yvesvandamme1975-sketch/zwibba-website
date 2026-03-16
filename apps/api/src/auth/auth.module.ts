import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';
import { TwilioVerifyService } from './twilio-verify.service';

@Module({
  controllers: [AuthController],
  exports: [AuthService, SessionAuthGuard],
  providers: [AuthService, SessionAuthGuard, TwilioVerifyService],
})
export class AuthModule {}
