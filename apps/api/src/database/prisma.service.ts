import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { loadEnv } from '../config/env';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const env = loadEnv();

    super({
      datasources: {
        db: {
          url: env.databaseUrl,
        },
      },
    });
  }
}
