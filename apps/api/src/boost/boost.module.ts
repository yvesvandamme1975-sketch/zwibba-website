import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BoostController } from './boost.controller';
import { BoostService } from './boost.service';

@Module({
  imports: [AuthModule],
  controllers: [BoostController],
  providers: [BoostService],
})
export class BoostModule {}
