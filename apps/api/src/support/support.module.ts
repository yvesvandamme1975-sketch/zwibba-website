import { Module } from '@nestjs/common';

import { loadEnv } from '../config/env';
import {
  SUPPORT_AGENT_SERVICE,
  SUPPORT_WEBHOOK_ENV,
} from './support.controller';
import { SupportController } from './support.controller';
import { SupportReplySender } from './support-reply.sender';
import {
  createAnthropicSupportModelClient,
  SUPPORT_MODEL_CLIENT,
  SupportAgentService,
} from './support-agent.service';

@Module({
  controllers: [SupportController],
  providers: [
    SupportReplySender,
    {
      provide: SUPPORT_MODEL_CLIENT,
      // Real, network-backed Claude client. Tests never hit this path: they
      // construct SupportAgentService directly with a fake SupportModelClient,
      // or override SUPPORT_AGENT_SERVICE entirely (see webhook.test.ts).
      useFactory: () => createAnthropicSupportModelClient(),
    },
    {
      provide: SUPPORT_AGENT_SERVICE,
      useClass: SupportAgentService,
    },
    {
      provide: SUPPORT_WEBHOOK_ENV,
      // Registered as a real provider (rather than left purely @Optional)
      // so tests can override it via Test.createTestingModule(...)
      // .overrideProvider(SUPPORT_WEBHOOK_ENV) the same way other modules
      // override PrismaService, etc.
      useFactory: () => loadEnv(),
    },
  ],
})
export class SupportModule {}
