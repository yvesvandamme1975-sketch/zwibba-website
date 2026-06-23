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

@Controller('listings')
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly reviewsService: ReviewsService) {}

  @Post(':slug/reviews')
  @UseGuards(SessionAuthGuard)
  submitReview(
    @Body() body: {
      comment?: string | null;
      rating?: number | string | null;
    },
    @CurrentSession() session: SessionRecord,
    @Param('slug') slug: string,
  ) {
    return this.reviewsService.submitReview({
      comment: body?.comment,
      rating: body?.rating,
      session,
      slug,
    });
  }
}
