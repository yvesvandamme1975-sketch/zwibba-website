import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SessionRecord } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class BoostService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
  ) {}

  async activateBoost({
    listingId,
    session,
  }: {
    listingId: string;
    session: SessionRecord;
  }) {
    const user = await this.prismaService.user.findUnique({
      where: {
        phoneNumber: session.phoneNumber,
      },
    });
    const listing = await this.prismaService.listing.findUnique({
      where: {
        id: listingId,
      },
    });

    if (!user || !listing || listing.ownerPhoneNumber !== session.phoneNumber) {
      throw new NotFoundException('Annonce introuvable pour ce boost.');
    }

    await this.prismaService.$transaction(async (transaction: Prisma.TransactionClient) => {
      const walletTransaction = await transaction.walletTransaction.create({
        data: {
          amountCdf: -15000,
          createdAtLabel: 'Aujourd’hui',
          kind: 'debit',
          label: `Boost annonce ${listing.title}`,
          userId: user.id,
        },
      });

      await transaction.boostPurchase.create({
        data: {
          amountCdf: 15000,
          durationHours: 24,
          listingId: listing.id,
          userId: user.id,
          walletTransactionId: walletTransaction.id,
        },
      });
    });

    return {
      amountCdf: 15000,
      listingId,
      promoted: true,
      statusLabel: 'Boost activé pour 24 h',
    };
  }
}
