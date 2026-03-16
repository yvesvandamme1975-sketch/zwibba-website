import { Module } from '@nestjs/common';

import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { DraftsModule } from './drafts/drafts.module';

@Module({
  imports: [AuthModule, DraftsModule, AiModule],
})
export class AppModule {}
