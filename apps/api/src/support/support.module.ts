import { Module } from '@nestjs/common';

import { loadEnv } from '../config/env';
import {
  SUPPORT_AGENT_SERVICE,
  SUPPORT_WEBHOOK_ENV,
} from './support.controller';
import { SupportController } from './support.controller';
import {
  createHttpSupportEmailSender,
  SUPPORT_EMAIL_SENDER,
  SupportEscalationService,
} from './support-escalation.service';
import { SupportReplySender } from './support-reply.sender';
import {
  createAnthropicSupportModelClient,
  SUPPORT_AGENT_DAILY_LIMIT,
  SUPPORT_AGENT_RATE_LIMIT,
  SUPPORT_MODEL_CLIENT,
  SupportAgentService,
} from './support-agent.service';

@Module({
  controllers: [SupportController],
  providers: [
    SupportReplySender,
    SupportEscalationService,
    {
      provide: SUPPORT_MODEL_CLIENT,
      // Real, network-backed Claude client. Tests never hit this path: they
      // construct SupportAgentService directly with a fake SupportModelClient,
      // or override SUPPORT_AGENT_SERVICE entirely (see webhook.test.ts).
      useFactory: () => createAnthropicSupportModelClient(),
    },
    {
      provide: SUPPORT_EMAIL_SENDER,
      // Real, fetch-backed transactional email client. Tests never hit this
      // path either: they construct SupportEscalationService directly with a
      // fake SupportEmailSender (see test/support/escalation.test.ts).
      useFactory: () => createHttpSupportEmailSender(),
    },
    {
      provide: SUPPORT_AGENT_SERVICE,
      useClass: SupportAgentService,
    },
    {
      // Both cost ceilings come from env rather than staying baked into the
      // service. Previously neither token was registered at all, so the
      // hard-coded defaults were the only possible values and tuning the
      // agent's spend meant editing code and redeploying.
      provide: SUPPORT_AGENT_RATE_LIMIT,
      useFactory: () => loadEnv().support.rateLimit,
    },
    {
      provide: SUPPORT_AGENT_DAILY_LIMIT,
      useFactory: () => loadEnv().support.dailyLimit,
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
