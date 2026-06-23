import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';

const ALLOWED_REVIEW_REPORT_REASONS = new Set(['spam', 'offensive', 'fake', 'other']);

@Injectable()
export class ReviewReportsService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async reportReview({
    reason,
    reviewId,
    session,
  }: {
    reason?: string | null;
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

    const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
    if (!ALLOWED_REVIEW_REPORT_REASONS.has(normalizedReason)) {
      throw new BadRequestException('Motif de signalement invalide.');
    }

    const reporterUserId = await this.resolveReporterUserId(session);
    if (!reporterUserId) {
      throw new UnauthorizedException('Session inconnue.');
    }

    return this.prismaService.reviewReport?.upsert?.({
      where: {
        reviewId_reporterUserId: {
          reporterUserId,
          reviewId: review.id,
        },
      },
      update: {
        reason: normalizedReason,
        status: 'pending',
      },
      create: {
        reason: normalizedReason,
        reporterUserId,
        reviewId: review.id,
        status: 'pending',
      },
    });
  }

  private async resolveReporterUserId(session: SessionRecord) {
    const persistedSession = await this.prismaService.session?.findUnique?.({
      where: {
        token: session.sessionToken,
      },
      include: {
        user: true,
      },
    });

    return persistedSession?.user?.id ?? null;
  }
}
