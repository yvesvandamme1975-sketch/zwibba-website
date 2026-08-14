import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { loadEnv } from './config/env';
import { resolveAllowedOrigins } from './config/allowed-origins';

async function bootstrap() {
  const env = loadEnv();
  // rawBody: true captures the exact request bytes (req.rawBody) alongside
  // the normal parsed JSON body, without disabling body parsing anywhere
  // else. The WhatsApp webhook needs the raw bytes to verify the
  // X-Hub-Signature-256 HMAC; every other route is unaffected.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({ origin: resolveAllowedOrigins(process.env) });
  await app.listen(env.port);
}

void bootstrap();
