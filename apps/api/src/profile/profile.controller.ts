import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { CurrentSession } from '../auth/current-session.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(@Inject(ProfileService) private readonly profileService: ProfileService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  getProfile(@CurrentSession() session: SessionRecord) {
    return this.profileService.getProfile(session);
  }

  @Post()
  @UseGuards(SessionAuthGuard)
  updateProfile(
    @CurrentSession() session: SessionRecord,
    @Body() body: {
      area?: string;
    },
  ) {
    return this.profileService.updateProfile({
      area: body.area ?? '',
      session,
    });
  }
}
