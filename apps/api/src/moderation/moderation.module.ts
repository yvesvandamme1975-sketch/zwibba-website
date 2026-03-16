import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DraftsModule } from '../drafts/drafts.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [AuthModule, DraftsModule],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
