import { Module } from '@nestjs/common';

import { loadEnv } from '../config/env';
import {
  InboundWhatsappMessage,
  SUPPORT_AGENT_SERVICE,
  SUPPORT_WEBHOOK_ENV,
  SupportAgentServiceLike,
} from './support.controller';
import { SupportController } from './support.controller';

/**
 * Placeholder implementation of the support agent used until Task 7 wires
 * up the real Claude-backed SupportAgentService under the same
 * SUPPORT_AGENT_SERVICE token. Intentionally a no-op so the webhook can be
 * deployed and verified by Meta without any inbound message processing yet.
 */
class NoopSupportAgentService implements SupportAgentServiceLike {
  handleInboundMessage(_message: InboundWhatsappMessage): void {
    // No-op: replaced by the real support agent service in Task 7.
  }
}

@Module({
  controllers: [SupportController],
  providers: [
    {
      provide: SUPPORT_AGENT_SERVICE,
      useClass: NoopSupportAgentService,
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
