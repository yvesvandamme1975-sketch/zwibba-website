import { Controller, Get, Inject } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

@Controller('healthz')
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
  ) {}

  @Get()
  async getHealth() {
    await this.prismaService.$queryRaw`SELECT 1`;

    return {
      database: 'up',
      status: 'ok',
    };
  }
}
