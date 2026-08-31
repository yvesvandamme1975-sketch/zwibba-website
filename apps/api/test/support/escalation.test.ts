import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HttpSupportEmailSender,
  SupportEscalationService,
  type SupportEmailSender,
} from '../../src/support/support-escalation.service';
import {
  DEFAULT_SUPPORT_AGENT_RATE_LIMIT,
  SupportAgentService,
  type SupportModelClient,
  type SupportModelReply,
} from '../../src/support/support-agent.service';
import type { InboundWhatsappMessage } from '../../src/support/support.controller';

// ---------------------------------------------------------------------------
// HttpSupportEmailSender — the minimal, env-gated transactional email client.
// ---------------------------------------------------------------------------

test('HttpSupportEmailSender posts to the provider API and returns true on a 2xx response', async () => {
  const requests: Array<{ url: string; method?: string; headers: HeadersInit; body: unknown }> =
    [];
  const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({
      body: JSON.parse(String(init?.body)),
      headers: init?.headers ?? {},
      method: init?.method,
      url: String(url),
    });
    return new Response(JSON.stringify({ id: 'email_1' }), { status: 200 });
  };
  const sender = new HttpSupportEmailSender({ apiKey: 'test-email-api-key', fetchFn });

  const result = await sender.sendEmail({
    to: 'hello@aivesconsulting.com',
    subject: 'Zwibba support escalation',
    body: 'Some body',
  });

  assert.equal(result, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  const body = requests[0].body as { to: string[]; subject: string; text: string };
  assert.deepEqual(body.to, ['hello@aivesconsulting.com']);
  assert.equal(body.subject, 'Zwibba support escalation');
  assert.equal(body.text, 'Some body');
});

test('HttpSupportEmailSender does not call fetch and returns false when no API key is configured', async () => {
  const calls: unknown[] = [];
  const fetchFn = async (...args: unknown[]) => {
    calls.push(args);
    return new Response('{}', { status: 200 });
  };
  const warnings: unknown[] = [];
  const sender = new HttpSupportEmailSender({
    apiKey: undefined,
    fetchFn,
    logger: { warn: (...args: unknown[]) => warnings.push(args), error: () => {} },
  });

  const result = await sender.sendEmail({
    to: 'hello@aivesconsulting.com',
    subject: 'subject',
    body: 'body',
  });

  assert.equal(result, false);
  assert.equal(calls.length, 0);
  assert.ok(warnings.length > 0, 'an unconfigured sender should log a warning');
});

test('HttpSupportEmailSender returns false (does not throw) on a non-2xx response', async () => {
  const fetchFn = async () => new Response('server error', { status: 500 });
  const sender = new HttpSupportEmailSender({ apiKey: 'test-email-api-key', fetchFn });

  const result = await sender.sendEmail({ to: 'a@b.com', subject: 's', body: 'b' });

  assert.equal(result, false);
});

test('HttpSupportEmailSender returns false (does not throw) when fetch itself rejects', async () => {
  const fetchFn = async () => {
    throw new Error('network down');
  };
  const sender = new HttpSupportEmailSender({ apiKey: 'test-email-api-key', fetchFn });

  const result = await sender.sendEmail({ to: 'a@b.com', subject: 's', body: 'b' });

  assert.equal(result, false);
});

// ---------------------------------------------------------------------------
// SupportEscalationService — sends the email, persists an audit note, never
// throws.
// ---------------------------------------------------------------------------

type SupportActionLogRecord = {
  id: string;
  waId: string;
  action: string;
  outcome: string;
  payloadJson: unknown;
  targetId: string | null;
  matchedPhoneNumber: string | null;
  createdAt: Date;
};

class FakeSupportActionLogDelegate {
  records: SupportActionLogRecord[] = [];
  private nextId = 1;

  async create({ data }: { data: Partial<SupportActionLogRecord> & { waId: string; action: string; outcome: string } }) {
    const record: SupportActionLogRecord = {
      id: `action_${this.nextId++}`,
      waId: data.waId,
      action: data.action,
      outcome: data.outcome,
      payloadJson: data.payloadJson ?? null,
      targetId: data.targetId ?? null,
      matchedPhoneNumber: data.matchedPhoneNumber ?? null,
      createdAt: new Date(),
    };
    this.records.push(record);
    return record;
  }
}

class FakePrismaServiceForEscalation {
  readonly supportActionLog = new FakeSupportActionLogDelegate();
}

class FakeSupportEmailSender implements SupportEmailSender {
  readonly calls: Array<{ to: string; subject: string; body: string }> = [];
  shouldSucceed = true;
  shouldThrow = false;

  async sendEmail(input: { to: string; subject: string; body: string }) {
    this.calls.push(input);
    if (this.shouldThrow) {
      throw new Error('boom');
    }
    return this.shouldSucceed;
  }
}

function makeEscalationService() {
  const emailSender = new FakeSupportEmailSender();
  const prismaService = new FakePrismaServiceForEscalation();
  const escalationEnv = { support: { escalationEmail: 'hello@aivesconsulting.com' } };
  const service = new SupportEscalationService(emailSender, prismaService as any, escalationEnv);

  return { service, emailSender, prismaService };
}

test('SupportEscalationService.escalate sends an email to the configured address with waId, summary, and history', async () => {
  const { service, emailSender, prismaService } = makeEscalationService();

  const result = await service.escalate({
    waId: '243990000001',
    reason: 'unresolved_billing_issue',
    summary: "Le client n'arrive pas à booster son annonce.",
    history: [
      { role: 'user', content: 'Comment booster mon annonce ?' },
      { role: 'assistant', content: 'Je vérifie cela pour vous.' },
    ],
  });

  assert.equal(result, true);
  assert.equal(emailSender.calls.length, 1);
  const email = emailSender.calls[0];
  assert.equal(email.to, 'hello@aivesconsulting.com');
  assert.match(email.subject, /243990000001/);
  assert.match(email.body, /243990000001/);
  assert.match(email.body, /unresolved_billing_issue/);
  assert.match(email.body, /n'arrive pas à booster son annonce/);
  assert.match(email.body, /Comment booster mon annonce/);
  assert.match(email.body, /Je vérifie cela pour vous/);

  assert.equal(prismaService.supportActionLog.records.length, 1);
  assert.equal(prismaService.supportActionLog.records[0].waId, '243990000001');
  assert.equal(prismaService.supportActionLog.records[0].action, 'escalate');
  assert.equal(prismaService.supportActionLog.records[0].outcome, 'sent');
});

test('SupportEscalationService.escalate returns false and logs a failed outcome when the email send returns false', async () => {
  const { service, emailSender, prismaService } = makeEscalationService();
  emailSender.shouldSucceed = false;

  const result = await service.escalate({
    waId: '243990000002',
    reason: 'unresolved',
    summary: 'summary',
    history: [],
  });

  assert.equal(result, false);
  assert.equal(prismaService.supportActionLog.records.length, 1);
  assert.equal(prismaService.supportActionLog.records[0].outcome, 'failed');
});

test('SupportEscalationService.escalate does not throw when the email sender itself throws', async () => {
  const { service, emailSender, prismaService } = makeEscalationService();
  emailSender.shouldThrow = true;

  const result = await service.escalate({
    waId: '243990000003',
    reason: 'unresolved',
    summary: 'summary',
    history: [],
  });

  assert.equal(result, false);
  assert.equal(prismaService.supportActionLog.records[0].outcome, 'failed');
});

test('SupportEscalationService.escalate does not throw even when persisting the audit log itself fails', async () => {
  const emailSender = new FakeSupportEmailSender();
  const prismaService = new FakePrismaServiceForEscalation();
  prismaService.supportActionLog.create = async () => {
    throw new Error('db down');
  };
  const escalationEnv = { support: { escalationEmail: 'hello@aivesconsulting.com' } };
  const service = new SupportEscalationService(emailSender, prismaService as any, escalationEnv);

  const result = await service.escalate({
    waId: '243990000004',
    reason: 'unresolved',
    summary: 'summary',
    history: [],
  });

  assert.equal(result, true);
});

// ---------------------------------------------------------------------------
// Wired into SupportAgentService: the model calling the `escalate` tool
// results in an email being sent and a graceful, bilingual reply to the
// customer — even when the email itself fails to send.
// ---------------------------------------------------------------------------

type SupportMessageRecord = {
  id: string;
  conversationId: string;
  role: string;
  body: string;
  waMessageId: string | null;
  createdAt: Date;
};

type SupportConversationRecord = {
  id: string;
  waId: string;
  lastInboundAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

class FakeSupportConversationDelegate {
  records: SupportConversationRecord[] = [];
  private nextId = 1;

  async upsert({
    where,
    create,
    update,
  }: {
    where: { waId: string };
    create: { waId: string; lastInboundAt?: Date };
    update: { lastInboundAt?: Date };
  }) {
    const existing = this.records.find((record) => record.waId === where.waId);

    if (existing) {
      Object.assign(existing, update, { updatedAt: new Date() });
      return existing;
    }

    const record: SupportConversationRecord = {
      id: `conversation_${this.nextId++}`,
      waId: create.waId,
      lastInboundAt: create.lastInboundAt ?? null,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.push(record);

    return record;
  }
}

class FakeSupportMessageDelegate {
  records: SupportMessageRecord[] = [];
  private nextId = 1;

  async create({
    data,
  }: {
    data: { conversationId: string; role: string; body: string; waMessageId?: string | null };
  }) {
    if (
      data.waMessageId &&
      this.records.some((record) => record.waMessageId === data.waMessageId)
    ) {
      const error = new Error('Unique constraint failed') as Error & { code?: string };
      error.code = 'P2002';
      throw error;
    }

    const record: SupportMessageRecord = {
      id: `message_${this.nextId++}`,
      conversationId: data.conversationId,
      role: data.role,
      body: data.body,
      waMessageId: data.waMessageId ?? null,
      createdAt: new Date(),
    };
    this.records.push(record);

    return record;
  }

  async findUnique({ where }: { where: { waMessageId: string } }) {
    return this.records.find((record) => record.waMessageId === where.waMessageId) ?? null;
  }

  async count({
    where,
  }: {
    where: { conversationId: string; role: string; createdAt?: { gte: Date } };
  }) {
    return this.records.filter((record) => {
      if (record.conversationId !== where.conversationId) return false;
      if (record.role !== where.role) return false;
      if (where.createdAt && record.createdAt.getTime() < where.createdAt.gte.getTime()) {
        return false;
      }
      return true;
    }).length;
  }

  async findMany({
    where,
    orderBy,
    take,
  }: {
    where: { conversationId: string };
    orderBy: { createdAt: 'asc' | 'desc' };
    take?: number;
  }) {
    const filtered = this.records
      .filter((record) => record.conversationId === where.conversationId)
      .sort((left, right) =>
        orderBy.createdAt === 'desc'
          ? right.createdAt.getTime() - left.createdAt.getTime()
          : left.createdAt.getTime() - right.createdAt.getTime(),
      );

    return typeof take === 'number' ? filtered.slice(0, take) : filtered;
  }
}

class FakePrismaService {
  readonly supportConversation = new FakeSupportConversationDelegate();
  readonly supportMessage = new FakeSupportMessageDelegate();
}

class EscalatingModelClient implements SupportModelClient {
  readonly calls: Array<{ tools?: unknown[] }> = [];

  async generateReply(input: { tools?: unknown[] }): Promise<SupportModelReply> {
    this.calls.push(input);
    return {
      type: 'tool_use',
      id: 'toolu_1',
      name: 'escalate',
      input: {
        reason: 'unresolved_billing_issue',
        summary: "Le client n'arrive pas à booster son annonce.",
      },
    };
  }
}

class FakeSupportReplySender {
  readonly sent: Array<{ waId: string; body: string }> = [];

  async sendText(waId: string, body: string) {
    this.sent.push({ waId, body });
    return { messageId: `wamid.${this.sent.length}` };
  }
}

class FakeSupportEscalationService {
  readonly calls: Array<{ waId: string; reason: string; summary: string; history: unknown[] }> =
    [];
  result = true;

  async escalate(input: { waId: string; reason: string; summary: string; history: unknown[] }) {
    this.calls.push(input);
    return this.result;
  }
}

function inbound(overrides: Partial<InboundWhatsappMessage> = {}): InboundWhatsappMessage {
  return {
    waId: '243990000001',
    text: 'Je veux parler à un humain, mon problème de boost persiste.',
    messageId: 'wamid.1',
    ...overrides,
  };
}

function makeAgentService() {
  const prismaService = new FakePrismaService();
  const modelClient = new EscalatingModelClient();
  const replySender = new FakeSupportReplySender();
  const escalationService = new FakeSupportEscalationService();
  const service = new SupportAgentService(
    prismaService as any,
    modelClient,
    replySender as any,
    escalationService as any,
    DEFAULT_SUPPORT_AGENT_RATE_LIMIT,
  );

  return { service, prismaService, modelClient, replySender, escalationService };
}

test('the agent calling the escalate tool sends an escalation email with waId, reason, summary, and history, then replies with the bilingual reassurance message', async () => {
  const { service, replySender, escalationService } = makeAgentService();

  await service.handleInboundMessage(inbound());

  assert.equal(escalationService.calls.length, 1);
  const call = escalationService.calls[0];
  assert.equal(call.waId, '243990000001');
  assert.equal(call.reason, 'unresolved_billing_issue');
  assert.equal(call.summary, "Le client n'arrive pas à booster son annonce.");
  assert.ok(Array.isArray(call.history));

  assert.equal(replySender.sent.length, 1);
  const replyBody = replySender.sent[0].body;
  assert.match(replyBody, /email/i);
  // Bilingual: French AND English wording present.
  assert.match(replyBody, /équipe/i);
});

test('the escalate tool exposed to the model is the FIRST tool in the tool list', async () => {
  const { service, modelClient } = makeAgentService();

  await service.handleInboundMessage(inbound());

  assert.equal(modelClient.calls.length, 1);
  const tools = modelClient.calls[0].tools as Array<{ name: string }> | undefined;
  assert.ok(tools && tools.length > 0, 'tools should be passed to the model');
  assert.equal(tools?.[0]?.name, 'escalate');
});

test('when the escalation email fails to send, the agent still replies gracefully to the customer and does not crash', async () => {
  const { service, replySender, escalationService } = makeAgentService();
  escalationService.result = false;

  await assert.doesNotReject(() => service.handleInboundMessage(inbound()));

  assert.equal(escalationService.calls.length, 1);
  assert.equal(replySender.sent.length, 1);
  assert.match(replySender.sent[0].body, /email/i);
});
