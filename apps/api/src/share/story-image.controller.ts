import { Controller, Get, Header, Inject, NotFoundException, Param, ServiceUnavailableException, StreamableFile } from '@nestjs/common';
import { StoryImageService } from './story-image.service';

@Controller('share')
export class StoryImageController {
  constructor(@Inject(StoryImageService) private readonly images: StoryImageService) {}

  @Get(':slug/story.png')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'no-store')
  async getStory(@Param('slug') slug: string) {
    try { return new StreamableFile(await this.images.generateStoryForSlug(slug)); }
    catch (error) {
      if (error instanceof NotFoundException) throw new NotFoundException('Annonce indisponible.');
      if (error instanceof Error && 'getStatus' in error) throw error;
      throw new ServiceUnavailableException('Story temporairement indisponible. Réessayez.');
    }
  }
}
