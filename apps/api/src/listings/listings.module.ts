import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ReviewRepliesController } from './review-replies.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [AuthModule],
  controllers: [ListingsController, ReviewRepliesController, ReviewsController],
  providers: [ListingsService, ReviewsService],
})
export class ListingsModule {}
