import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { MarketSignalsController } from './market-signals.controller';
import { MarketSignalsService } from './market-signals.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MarketSignalsController],
  providers: [MarketSignalsService],
  exports: [MarketSignalsService],
})
export class MarketSignalsModule {}
