import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { SellersController } from './sellers.controller';

@Module({
  controllers: [ProfileController, SellersController],
  imports: [AuthModule],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
