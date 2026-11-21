import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { MediaModule } from '../media/media.module';
import { StoryImageController } from './story-image.controller';
import { StoryImageService } from './story-image.service';

@Module({
  imports: [DatabaseModule, MediaModule],
  controllers: [StoryImageController],
  exports: [StoryImageService],
  providers: [StoryImageService],
})
export class ShareModule {}
