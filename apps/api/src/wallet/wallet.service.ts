import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletService {
  getWallet() {
    return {
      balanceCdf: 120000,
      transactions: [
        {
          id: 'wallet_tx_1',
          label: 'Vente Samsung Galaxy A54',
          amountCdf: 450000,
          kind: 'credit',
          createdAtLabel: 'Aujourd’hui',
        },
        {
          id: 'wallet_tx_2',
          label: 'Boost annonce canapé',
          amountCdf: -15000,
          kind: 'debit',
          createdAtLabel: 'Hier',
        },
      ],
    };
  }
}
