import { Injectable } from '@nestjs/common';

@Injectable()
export class BoostService {
  activateBoost(listingId: string) {
    return {
      listingId,
      promoted: true,
      amountCdf: 15000,
      statusLabel: 'Boost activé pour 24 h',
    };
  }
}
