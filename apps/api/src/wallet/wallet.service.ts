import { Inject, Injectable } from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class WalletService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
  ) {}

  async getWallet(session: SessionRecord) {
    const user = await this.prismaService.user.findUnique({
      where: {
        phoneNumber: session.phoneNumber,
      },
    });

    if (!user) {
      return {
        balanceCdf: 0,
        transactions: [],
      };
    }

    const transactions = await this.prismaService.walletTransaction.findMany({
      where: {
        userId: user.id,
      },
    }) as Array<{
      amountCdf: number;
      createdAtLabel: string;
      id: string;
      kind: string;
      label: string;
    }>;
    const balanceCdf = transactions.reduce((total: number, transaction) => {
      return total + transaction.amountCdf;
    }, 0);

    return {
      balanceCdf,
      transactions: transactions.map((transaction) => ({
        amountCdf: transaction.amountCdf,
        createdAtLabel: transaction.createdAtLabel,
        id: transaction.id,
        kind: transaction.kind,
        label: transaction.label,
      })),
    };
  }
}
