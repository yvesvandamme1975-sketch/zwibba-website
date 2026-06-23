import { Controller, Get, Inject, Param } from '@nestjs/common';

import { ProfileService } from './profile.service';

@Controller('sellers')
export class SellersController {
  constructor(@Inject(ProfileService) private readonly profileService: ProfileService) {}

  @Get(':sellerId')
  getPublicSeller(@Param('sellerId') sellerId: string) {
    return this.profileService.getPublicSeller(sellerId);
  }
}
