import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { MediaModule } from '../media/media.module';
import { StoryImageService } from './story-image.service';

@Module({
  imports: [DatabaseModule, MediaModule],
  exports: [StoryImageService],
  providers: [StoryImageService],
})
export class ShareModule {}
