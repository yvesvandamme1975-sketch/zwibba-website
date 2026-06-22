import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { loadEnv } from './config/env';
import { resolveAllowedOrigins } from './config/allowed-origins';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: resolveAllowedOrigins(process.env) });
  await app.listen(env.port);
}

void bootstrap();
