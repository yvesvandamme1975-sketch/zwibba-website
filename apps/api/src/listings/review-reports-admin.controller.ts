import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';

import { ReviewReportsService } from './review-reports.service';

@Controller('review-reports')
export class ReviewReportsAdminController {
  constructor(
    @Inject(ReviewReportsService)
    private readonly reviewReportsService: ReviewReportsService,
  ) {}

  @Get('queue')
  listQueue() {
    return this.reviewReportsService.listQueue();
  }

  @Post(':reportId/dismiss')
  dismiss(@Param('reportId') reportId: string) {
    return this.reviewReportsService.dismiss(reportId);
  }

  @Post(':reportId/remove-review')
  removeReview(@Param('reportId') reportId: string) {
    return this.reviewReportsService.removeReview(reportId);
  }
}
