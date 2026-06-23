import {
  Body,
  Controller,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { CurrentSession } from '../auth/current-session.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ReviewReportsService } from './review-reports.service';

@Controller('reviews')
export class ReviewReportsController {
  constructor(
    @Inject(ReviewReportsService)
    private readonly reviewReportsService: ReviewReportsService,
  ) {}

  @Post(':reviewId/report')
  @UseGuards(SessionAuthGuard)
  reportReview(
    @Body() body: {
      reason?: string | null;
    },
    @CurrentSession() session: SessionRecord,
    @Param('reviewId') reviewId: string,
  ) {
    return this.reviewReportsService.reportReview({
      reason: body?.reason,
      reviewId,
      session,
    });
  }
}
