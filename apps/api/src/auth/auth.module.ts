import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';
import { OtpService } from './otp.service';
import { WhatsappOtpSender } from './whatsapp-otp.sender';

@Module({
  controllers: [AuthController],
  exports: [AuthService, SessionAuthGuard],
  providers: [AuthService, SessionAuthGuard, OtpService, WhatsappOtpSender],
})
export class AuthModule {}
