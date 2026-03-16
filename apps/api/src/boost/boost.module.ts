import { Module } from '@nestjs/common';

import { BoostController } from './boost.controller';
import { BoostService } from './boost.service';

@Module({
  controllers: [BoostController],
  providers: [BoostService],
})
export class BoostModule {}
