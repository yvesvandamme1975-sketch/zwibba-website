import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_SUPPORT_AGENT_RATE_LIMIT,
  SupportAgentService,
  type SupportModelClient,
  type SupportModelMessage,
} from '../../src/support/support-agent.service';
import type { InboundWhatsappMessage } from '../../src/support/support.controller';

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
      .sort((left, right) => (
        orderBy.createdAt === 'desc'
          ? right.createdAt.getTime() - left.createdAt.getTime()
          : left.createdAt.getTime() - right.createdAt.getTime()
      ));

    return typeof take === 'number' ? filtered.slice(0, take) : filtered;
  }
}

class FakePrismaService {
  readonly supportConversation = new FakeSupportConversationDelegate();
  readonly supportMessage = new FakeSupportMessageDelegate();
}

class FakeSupportModelClient implements SupportModelClient {
  readonly calls: Array<{ system: string; messages: SupportModelMessage[]; tools?: unknown[] }> =
    [];
  reply = 'Bonjour, comment puis-je vous aider ?';

  async generateReply(input: { system: string; messages: SupportModelMessage[]; tools?: unknown[] }) {
    this.calls.push(input);
    return { text: this.reply, type: 'text' as const };
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

  async escalate(input: { waId: string; reason: string; summary: string; history: unknown[] }) {
    this.calls.push(input);
    return true;
  }
}

function makeService(options?: { maxInboundPerWindow?: number; windowMs?: number }) {
  const prismaService = new FakePrismaService();
  const modelClient = new FakeSupportModelClient();
  const replySender = new FakeSupportReplySender();
  const escalationService = new FakeSupportEscalationService();
  const service = new SupportAgentService(
    prismaService as any,
    modelClient,
    replySender as any,
    escalationService as any,
    options
      ? {
          windowMs: options.windowMs ?? DEFAULT_SUPPORT_AGENT_RATE_LIMIT.windowMs,
          maxInboundPerWindow:
            options.maxInboundPerWindow ?? DEFAULT_SUPPORT_AGENT_RATE_LIMIT.maxInboundPerWindow,
        }
      : undefined,
  );

  return { service, prismaService, modelClient, replySender, escalationService };
}

function inbound(overrides: Partial<InboundWhatsappMessage> = {}): InboundWhatsappMessage {
  return {
    waId: '243990000001',
    text: 'Bonjour, comment vendre un article ?',
    messageId: 'wamid.1',
    ...overrides,
  };
}

test('handleInboundMessage persists the inbound message and the agent reply, and sends the reply', async () => {
  const { service, prismaService, modelClient, replySender } = makeService();

  await service.handleInboundMessage(inbound());

  assert.equal(prismaService.supportConversation.records.length, 1);
  const conversation = prismaService.supportConversation.records[0];
  assert.equal(conversation.waId, '243990000001');
  assert.ok(conversation.lastInboundAt instanceof Date);

  const messages = prismaService.supportMessage.records;
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, 'inbound');
  assert.equal(messages[0].body, 'Bonjour, comment vendre un article ?');
  assert.equal(messages[0].conversationId, conversation.id);
  assert.equal(messages[1].role, 'agent');
  assert.equal(messages[1].body, modelClient.reply);
  assert.equal(messages[1].conversationId, conversation.id);

  assert.equal(replySender.sent.length, 1);
  assert.deepEqual(replySender.sent[0], {
    waId: '243990000001',
    body: modelClient.reply,
  });
});

test('handleInboundMessage upserts the same conversation across multiple inbound messages for the same waId', async () => {
  const { service, prismaService } = makeService();

  await service.handleInboundMessage(inbound({ text: 'Premier message', messageId: 'wamid.1' }));
  await service.handleInboundMessage(inbound({ text: 'Deuxième message', messageId: 'wamid.2' }));

  assert.equal(prismaService.supportConversation.records.length, 1);
  // 2 inbound + 2 agent replies
  assert.equal(prismaService.supportMessage.records.length, 4);
});

test('handleInboundMessage sends the model client the system prompt and recent conversation context', async () => {
  const { service, modelClient } = makeService();

  await service.handleInboundMessage(
    inbound({ text: 'Comment booster une annonce ?', messageId: 'wamid.1' }),
  );

  assert.equal(modelClient.calls.length, 1);
  const call = modelClient.calls[0];
  assert.ok(call.system.length > 0);
  assert.ok(call.system.includes('Zwibba'));
  assert.equal(call.messages.length, 1);
  assert.deepEqual(call.messages[0], {
    role: 'user',
    content: 'Comment booster une annonce ?',
  });
});

test('handleInboundMessage passes a Dutch reply from the model client straight through to the sender', async () => {
  const { service, modelClient, replySender } = makeService();
  modelClient.reply = 'Hallo, waarmee kan ik u helpen?';

  await service.handleInboundMessage(
    inbound({ text: 'Hallo, hoe kan ik een artikel verkopen?', messageId: 'wamid.nl' }),
  );

  assert.equal(replySender.sent.length, 1);
  assert.equal(replySender.sent[0].body, 'Hallo, waarmee kan ik u helpen?');
});

test('handleInboundMessage rate-limits per waId: beyond the threshold it skips the Claude call and does not persist an agent reply', async () => {
  const { service, modelClient, replySender, prismaService } = makeService({
    maxInboundPerWindow: 2,
  });

  await service.handleInboundMessage(inbound({ text: 'Message 1', messageId: 'wamid.1' }));
  await service.handleInboundMessage(inbound({ text: 'Message 2', messageId: 'wamid.2' }));
  // Third inbound message within the window exceeds the threshold (2).
  await service.handleInboundMessage(inbound({ text: 'Message 3', messageId: 'wamid.3' }));

  assert.equal(modelClient.calls.length, 2, 'Claude should not be called past the threshold');

  const inboundMessages = prismaService.supportMessage.records.filter(
    (record) => record.role === 'inbound',
  );
  assert.equal(inboundMessages.length, 3, 'every inbound message is still persisted');

  const agentMessages = prismaService.supportMessage.records.filter(
    (record) => record.role === 'agent',
  );
  assert.equal(agentMessages.length, 2, 'no agent reply is persisted for the rate-limited message');

  // A rate-limit notice is sent instead of a model-generated reply.
  assert.equal(replySender.sent.length, 3);
  assert.notEqual(replySender.sent[2].body, modelClient.reply);
});

test('handleInboundMessage rate limiting is scoped per waId, not global', async () => {
  const { service, modelClient } = makeService({ maxInboundPerWindow: 1 });

  await service.handleInboundMessage(
    inbound({ waId: '243990000001', text: 'A1', messageId: 'wamid.a1' }),
  );
  await service.handleInboundMessage(
    inbound({ waId: '243990000002', text: 'B1', messageId: 'wamid.b1' }),
  );

  assert.equal(modelClient.calls.length, 2);
});
