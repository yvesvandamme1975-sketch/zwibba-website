import { Module } from '@nestjs/common';

import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { DraftsModule } from './drafts/drafts.module';
import { ListingsModule } from './listings/listings.module';
import { ModerationModule } from './moderation/moderation.module';

@Module({
  imports: [
    AuthModule,
    DraftsModule,
    AiModule,
    ModerationModule,
    ListingsModule,
    ChatModule,
  ],
})
export class AppModule {}
