import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';

import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(@Inject(LocationsService) private readonly locationsService: LocationsService) {}

  @Get('cities')
  listCities(
    @Query() query: {
      countryCode?: string;
    },
  ) {
    return this.locationsService.listCities({
      countryCode: query.countryCode ?? '',
    });
  }

  @Post('suggestions')
  suggestCity(
    @Body() body: {
      countryCode?: string;
      label?: string;
      type?: string;
    },
  ) {
    return this.locationsService.suggestCity({
      countryCode: body.countryCode ?? '',
      label: body.label ?? '',
      type: body.type ?? '',
    });
  }
}
