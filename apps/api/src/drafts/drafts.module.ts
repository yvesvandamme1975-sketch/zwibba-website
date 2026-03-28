import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';

@Module({
  controllers: [DraftsController],
  imports: [AuthModule, MediaModule],
  exports: [DraftsService],
  providers: [DraftsService],
})
export class DraftsModule {}
