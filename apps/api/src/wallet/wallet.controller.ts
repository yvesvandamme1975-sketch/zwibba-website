import { Controller, Get, Inject } from '@nestjs/common';

import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(
    @Inject(WalletService) private readonly walletService: WalletService,
  ) {}

  @Get()
  getWallet() {
    return this.walletService.getWallet();
  }
}
