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
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewRepliesController {
  constructor(@Inject(ReviewsService) private readonly reviewsService: ReviewsService) {}

  @Post(':reviewId/reply')
  @UseGuards(SessionAuthGuard)
  replyToReview(
    @Body() body: {
      reply?: string | null;
    },
    @CurrentSession() session: SessionRecord,
    @Param('reviewId') reviewId: string,
  ) {
    return this.reviewsService.replyToReview({
      reply: body?.reply,
      reviewId,
      session,
    });
  }
}
