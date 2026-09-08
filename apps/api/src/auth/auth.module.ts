import { loadLegalCatalog } from '../../assets/legal/catalog.mjs';
import { LEGAL_POLICY } from './legal-policy';
import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';
import { OtpService } from './otp.service';
import { WhatsappOtpSender } from './whatsapp-otp.sender';

@Module({
  controllers: [AuthController],
  exports: [AuthService, SessionAuthGuard],
  providers: [{ provide: LEGAL_POLICY, useFactory: () => loadLegalCatalog() }, AuthService, SessionAuthGuard, OtpService, WhatsappOtpSender],
})
export class AuthModule {}
