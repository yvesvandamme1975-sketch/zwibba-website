import { Controller, Get, Inject, UseGuards } from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { CurrentSession } from '../auth/current-session.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(SessionAuthGuard)
export class WalletController {
  constructor(
    @Inject(WalletService) private readonly walletService: WalletService,
  ) {}

  @Get()
  getWallet(@CurrentSession() session: SessionRecord) {
    return this.walletService.getWallet(session);
  }
}
