import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { normalizeReviewComment } from '../common/review-comment';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async replyToReview({
    reply,
    reviewId,
    session,
  }: {
    reply?: string | null;
    reviewId: string;
    session: SessionRecord;
  }) {
    const review = await this.prismaService.review?.findUnique?.({
      where: {
        id: reviewId,
      },
    });

    if (!review) {
      throw new NotFoundException('Avis introuvable.');
    }

    if (review.sellerPhoneNumber !== session.phoneNumber) {
      throw new ForbiddenException('Seul le vendeur concerné peut répondre à cet avis.');
    }

    const normalizedReply = normalizeReviewComment(reply);
    return this.prismaService.review.update({
      where: {
        id: review.id,
      },
      data: {
        sellerReply: normalizedReply,
        sellerReplyAt: normalizedReply ? new Date() : null,
      },
    });
  }

  async submitReview({
    comment,
    rating,
    session,
    slug,
  }: {
    comment?: string | null;
    rating?: number | string | null;
    session: SessionRecord;
    slug: string;
  }) {
    const listing = await this.prismaService.listing.findUnique({
      where: {
        slug,
      },
    });

    if (!listing) {
      throw new NotFoundException('Annonce introuvable.');
    }

    if (listing.ownerPhoneNumber === session.phoneNumber) {
      throw new BadRequestException('Vous ne pouvez pas noter votre propre annonce.');
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      throw new BadRequestException('La note doit être comprise entre 1 et 5.');
    }

    const normalizedComment = normalizeReviewComment(comment);
    const buyer = await this.prismaService.user.findUnique({
      where: {
        phoneNumber: session.phoneNumber,
      },
    });

    if (!buyer) {
      throw new UnauthorizedException('Session inconnue.');
    }

    return this.prismaService.review.upsert({
      where: {
        buyerUserId_listingId: {
          buyerUserId: buyer.id,
          listingId: listing.id,
        },
      },
      update: {
        comment: normalizedComment,
        rating: numericRating,
        sellerPhoneNumber: listing.ownerPhoneNumber,
      },
      create: {
        buyerUserId: buyer.id,
        comment: normalizedComment,
        listingId: listing.id,
        rating: numericRating,
        sellerPhoneNumber: listing.ownerPhoneNumber,
      },
    });
  }
}
