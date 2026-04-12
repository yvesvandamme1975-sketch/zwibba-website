import { Module } from '@nestjs/common';

import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { BoostModule } from './boost/boost.module';
import { ChatModule } from './chat/chat.module';
import { DatabaseModule } from './database/database.module';
import { DraftsModule } from './drafts/drafts.module';
import { HealthModule } from './health/health.module';
import { ListingsModule } from './listings/listings.module';
import { LocationsModule } from './locations/locations.module';
import { MediaModule } from './media/media.module';
import { ModerationModule } from './moderation/moderation.module';
import { ProfileModule } from './profile/profile.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
    DraftsModule,
    MediaModule,
    AiModule,
    ModerationModule,
    ListingsModule,
    LocationsModule,
    ChatModule,
    WalletModule,
    BoostModule,
    ProfileModule,
  ],
})
export class AppModule {}
