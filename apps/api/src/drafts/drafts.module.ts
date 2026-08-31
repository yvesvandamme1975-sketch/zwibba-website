import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { MarketSignalsModule } from '../market-signals/market-signals.module';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';

@Module({
  controllers: [DraftsController],
  imports: [AuthModule, MediaModule, MarketSignalsModule],
  exports: [DraftsService],
  providers: [DraftsService],
})
export class DraftsModule {}
