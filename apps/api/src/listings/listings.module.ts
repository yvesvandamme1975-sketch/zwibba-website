import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ReviewRepliesController } from './review-replies.controller';
import { ReviewReportsController } from './review-reports.controller';
import { ReviewReportsService } from './review-reports.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [AuthModule],
  controllers: [
    ListingsController,
    ReviewRepliesController,
    ReviewReportsController,
    ReviewsController,
  ],
  providers: [ListingsService, ReviewReportsService, ReviewsService],
})
export class ListingsModule {}
