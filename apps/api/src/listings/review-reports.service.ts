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

  async listQueue() {
    const reports = await this.prismaService.reviewReport?.findMany?.({
      where: {
        status: 'pending',
      },
      include: {
        review: {
          include: {
            listing: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      items: (reports ?? []).map((report) => this.toQueueItem(report)),
    };
  }

  async dismiss(reportId: string) {
    const report = await this.prismaService.reviewReport?.update?.({
      where: {
        id: reportId,
      },
      data: {
        status: 'dismissed',
      },
    });

    if (!report) {
      throw new NotFoundException('Signalement introuvable.');
    }

    return {
      id: report.id,
      status: report.status,
    };
  }

  async removeReview(reportId: string) {
    const report = await this.prismaService.reviewReport?.findUnique?.({
      where: {
        id: reportId,
      },
      include: {
        review: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Signalement introuvable.');
    }

    const reviewId = report.review?.id ?? report.reviewId;
    const deletedReview = await this.prismaService.review?.delete?.({
      where: {
        id: reviewId,
      },
    });

    if (!deletedReview) {
      throw new NotFoundException('Avis introuvable.');
    }

    return {
      reviewId,
      status: 'removed',
    };
  }

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

  private toQueueItem(report: {
    createdAt: Date | string;
    id: string;
    reason: string;
    review?: {
      comment?: string | null;
      id?: string;
      listing?: {
        slug?: string | null;
        title?: string | null;
      } | null;
      rating?: number;
    } | null;
    reviewId: string;
  }) {
    const review = report.review;
    const listing = review?.listing;
    const createdAt = report.createdAt instanceof Date
      ? report.createdAt.toISOString()
      : String(report.createdAt);

    return {
      commentExcerpt: this.toCommentExcerpt(review?.comment),
      createdAt,
      id: report.id,
      rating: review?.rating ?? null,
      reason: report.reason,
      reviewId: review?.id ?? report.reviewId,
      seller: {
        listingSlug: listing?.slug ?? '',
        listingTitle: listing?.title ?? '',
      },
    };
  }

  private toCommentExcerpt(comment?: string | null) {
    const cleaned = comment?.trim() ?? '';
    if (cleaned.length <= 140) {
      return cleaned;
    }

    return `${cleaned.slice(0, 137).trim()}...`;
  }
}
