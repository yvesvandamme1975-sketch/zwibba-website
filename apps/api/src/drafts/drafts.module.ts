import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';

@Module({
  controllers: [DraftsController],
  imports: [AuthModule],
  providers: [DraftsService],
})
export class DraftsModule {}
