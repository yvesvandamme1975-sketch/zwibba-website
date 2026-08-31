import assert from 'node:assert/strict';
import test from 'node:test';

import { Prisma } from '@prisma/client';

import {
  consumeDailyModelBudget,
  DAILY_LIMIT_NOTICE,
  type DailyModelBudgetState,
  MODEL_ERROR_REPLY,
  PENDING_ACTION_EXPIRED_REPLY,
  PENDING_ACTION_TTL_MS,
  SupportAgentService,
  type SupportModelClient,
  type SupportModelMessage,
  type SupportModelReply,
} from '../../src/support/support-agent.service';
import {
  executePendingAction,
  type SupportToolsPrismaClient,
} from '../../src/support/support-tools';
import type { InboundWhatsappMessage } from '../../src/support/support.controller';

// ---------------------------------------------------------------------------
// Fakes — a superset of the actions.test.ts fakes, adding: supportConversation
// .updateMany (atomic conditional consume), SupportMessage.waMessageId
// idempotency (findUnique + unique-violation on create), and controllable
// throwing for the error-handling / best-effort-audit tests.
// ---------------------------------------------------------------------------

type FakeUserRecord = { id: string; phoneNumber: string };

class FakeUserDelegate {
  records: FakeUserRecord[] = [];

  async findUnique({ where }: { where: { phoneNumber: string } }) {
    return this.records.find((record) => record.phoneNumber === where.phoneNumber) ?? null;
  }
}

type FakeListingRecord = {
  id: string;
  ownerPhoneNumber: string;
  title: string;
  lifecycleStatus: string;
  moderationStatus: string;
  priceAmount: number;
  priceCdf: number;
  priceCurrency: string;
  pausedAt?: Date | null;
  soldAt?: Date | null;
  soldChannel?: string | null;
  lifecycleChangedAt?: Date | null;
};

function listingRecord(
  overrides: Partial<FakeListingRecord> & { id: string; ownerPhoneNumber: string; title: string },
): FakeListingRecord {
  return {
    lifecycleStatus: 'active',
    moderationStatus: 'approved',
    priceAmount: 100,
    priceCdf: 100,
    priceCurrency: 'EUR',
    ...overrides,
  };
}

class FakeListingDelegate {
  records: FakeListingRecord[] = [];

  async findMany({ where }: { where: { ownerPhoneNumber: string } }) {
    return this.records.filter((record) => record.ownerPhoneNumber === where.ownerPhoneNumber);
  }

  async findUnique({ where }: { where: { id: string } }) {
    return this.records.find((record) => record.id === where.id) ?? null;
  }

  async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
    const record = this.records.find((item) => item.id === where.id);
    if (!record) {
      throw new Error(`FakeListingDelegate.update: no record ${where.id}`);
    }
    Object.assign(record, data);
    return record;
  }
}

class FakeListingLifecycleEventDelegate {
  records: Array<{ id: string } & Record<string, unknown>> = [];
  private nextId = 1;

  async create({ data }: { data: Record<string, unknown> }) {
    const record = { id: `event_${this.nextId++}`, ...data };
    this.records.push(record);
    return record;
  }
}

class FakeSupportActionLogDelegate {
  records: Array<{ id: string } & Record<string, unknown>> = [];
  private nextId = 1;
  throwOnCreate = false;

  async create({ data }: { data: Record<string, unknown> }) {
    if (this.throwOnCreate) {
      throw new Error('simulated audit insert failure');
    }
    const record = { id: `log_${this.nextId++}`, ...data };
    this.records.push(record);
    return record;
  }
}

type SupportConversationRecord = {
  id: string;
  waId: string;
  lastInboundAt: Date | null;
  status: string;
  pendingActionJson: unknown;
  pendingActionNonce: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Mirrors the real Prisma client's contract for a nullable `Json?` column: a
// bare `null` is REFUSED (Prisma throws) — callers must pass Prisma.DbNull or
// Prisma.JsonNull, which are then stored as a null column value. These fakes
// used to accept `null` silently, which is why 1 390 lines of tests over the
// confirmed-action path all passed while the real code threw in production on
// every "OUI". Enforcing the contract here means a regression fails the tests,
// not only `tsc`.
function writeJsonField(value: unknown): unknown {
  if (value === null) {
    throw new Error(
      'Prisma refuses a raw null on a Json? field — use Prisma.DbNull or Prisma.JsonNull.',
    );
  }

  return value === Prisma.DbNull || value === Prisma.JsonNull ? null : value;
}

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
      return { ...existing };
    }
    const record: SupportConversationRecord = {
      id: `conversation_${this.nextId++}`,
      waId: create.waId,
      lastInboundAt: create.lastInboundAt ?? null,
      status: 'open',
      pendingActionJson: null,
      pendingActionNonce: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.push(record);
    return { ...record };
  }

  async update({
    where,
    data,
  }: {
    where: { id: string };
    data: { pendingActionJson: unknown; pendingActionNonce?: string | null };
  }) {
    const record = this.records.find((item) => item.id === where.id);
    if (!record) {
      throw new Error(`FakeSupportConversationDelegate.update: no record ${where.id}`);
    }
    record.pendingActionJson = writeJsonField(data.pendingActionJson);
    if ('pendingActionNonce' in data) {
      record.pendingActionNonce = data.pendingActionNonce ?? null;
    }
    record.updatedAt = new Date();
    return record;
  }

  // Atomic conditional consume, now nonce-scoped: only flips the row whose
  // pendingActionNonce equals the exact nonce in the WHERE clause. Its body
  // runs synchronously (no awaits between read and write) so two racing
  // callers can never both match the same nonce.
  async updateMany({
    where,
    data,
  }: {
    where: { id: string; pendingActionNonce?: string | null };
    data: { pendingActionJson: unknown; pendingActionNonce?: string | null };
  }) {
    let count = 0;
    for (const record of this.records) {
      if (record.id !== where.id) continue;
      if ('pendingActionNonce' in where && record.pendingActionNonce !== where.pendingActionNonce) {
        continue;
      }
      record.pendingActionJson = writeJsonField(data.pendingActionJson);
      if ('pendingActionNonce' in data) {
        record.pendingActionNonce = data.pendingActionNonce ?? null;
      }
      record.updatedAt = new Date();
      count += 1;
    }
    return { count };
  }
}

type SupportMessageRecord = {
  id: string;
  conversationId: string;
  role: string;
  body: string;
  waMessageId: string | null;
  createdAt: Date;
};

class UniqueViolationError extends Error {
  code = 'P2002';
  constructor() {
    super('Unique constraint failed on the fields: (`waMessageId`)');
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
      throw new UniqueViolationError();
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
      if (where.createdAt && record.createdAt.getTime() < where.createdAt.gte.getTime()) return false;
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

class FakePrismaService implements SupportToolsPrismaClient {
  readonly user = new FakeUserDelegate();
  readonly listing = new FakeListingDelegate();
  readonly listingLifecycleEvent = new FakeListingLifecycleEventDelegate();
  readonly supportActionLog = new FakeSupportActionLogDelegate();
  readonly supportConversation = new FakeSupportConversationDelegate();
  readonly supportMessage = new FakeSupportMessageDelegate();
}

class ScriptedModelClient implements SupportModelClient {
  readonly calls: Array<{ messages: SupportModelMessage[] }> = [];
  constructor(private readonly replies: SupportModelReply[]) {}

  async generateReply(input: {
    system: string;
    messages: SupportModelMessage[];
    tools?: unknown[];
  }): Promise<SupportModelReply> {
    this.calls.push({ messages: input.messages });
    const index = Math.min(this.calls.length - 1, this.replies.length - 1);
    return this.replies[index];
  }
}

class ThrowingModelClient implements SupportModelClient {
  callCount = 0;
  async generateReply(): Promise<SupportModelReply> {
    this.callCount += 1;
    throw new Error('simulated model outage');
  }
}

class FakeSupportReplySender {
  readonly sent: Array<{ waId: string; body: string }> = [];
  throwOnce = false;
  // When true, sendText resolves `null` (mirroring SupportReplySender's
  // non-2xx behaviour) instead of a { messageId } — WITHOUT throwing.
  returnNull = false;

  async sendText(waId: string, body: string) {
    if (this.throwOnce) {
      this.throwOnce = false;
      throw new Error('simulated send failure');
    }
    if (this.returnNull) {
      return null;
    }
    this.sent.push({ waId, body });
    return { messageId: `wamid.${this.sent.length}` };
  }
}

class FakeSupportEscalationService {
  readonly calls: unknown[] = [];
  async escalate(input: unknown) {
    this.calls.push(input);
    return true;
  }
}

function buildService(
  prismaService: FakePrismaService,
  modelClient: SupportModelClient,
  replySender: FakeSupportReplySender = new FakeSupportReplySender(),
  pendingActionTtlMs?: number,
  dailyLimit?: number,
) {
  const escalationService = new FakeSupportEscalationService();
  const service = new SupportAgentService(
    prismaService as any,
    modelClient,
    replySender as any,
    escalationService as any,
    undefined,
    pendingActionTtlMs,
    dailyLimit,
  );
  return { service, replySender, escalationService };
}

function inbound(overrides: Partial<InboundWhatsappMessage> = {}): InboundWhatsappMessage {
  return {
    waId: '32494998210',
    text: 'Bonjour',
    messageId: 'wamid.1',
    ...overrides,
  };
}

function seedOwnedListing(prismaService: FakePrismaService) {
  prismaService.user.records.push({ id: 'user_1', phoneNumber: '+32494998210' });
  prismaService.listing.records.push(
    listingRecord({ id: 'listing_own', ownerPhoneNumber: '+32494998210', title: 'Mon vélo' }),
  );
}

async function seedPendingPause(
  prismaService: FakePrismaService,
  createdAt: string,
  nonce = 'nonce_seed',
) {
  const conversation = await prismaService.supportConversation.upsert({
    where: { waId: '32494998210' },
    create: { waId: '32494998210' },
    update: {},
  });
  const record = prismaService.supportConversation.records.find((r) => r.id === conversation.id)!;
  record.pendingActionJson = {
    action: 'pauseListing',
    targetId: 'listing_own',
    waId: '32494998210',
    payload: {},
    createdAt,
  };
  record.pendingActionNonce = nonce;
  return record;
}

// ---------------------------------------------------------------------------
// FIX 1 — Atomic confirmation consume + replay protection.
// ---------------------------------------------------------------------------

test('FIX1: two racing confirmations on the same pending action execute the mutation exactly ONCE', async () => {
  const prismaService = new FakePrismaService();
  seedOwnedListing(prismaService);
  await seedPendingPause(prismaService, new Date().toISOString());

  const modelClient = new ScriptedModelClient([{ type: 'text', text: 'ok' }]);
  const { service } = buildService(prismaService, modelClient);

  // Two distinct "OUI" deliveries (different message ids) racing concurrently.
  await Promise.all([
    service.handleInboundMessage(inbound({ text: 'OUI', messageId: 'wamid.oui.a' })),
    service.handleInboundMessage(inbound({ text: 'OUI', messageId: 'wamid.oui.b' })),
  ]);

  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'paused');
  const executedLogs = prismaService.supportActionLog.records.filter((r) => r.outcome === 'executed');
  assert.equal(executedLogs.length, 1, 'the mutation is executed exactly once');
  assert.equal(prismaService.listingLifecycleEvent.records.length, 1, 'exactly one lifecycle event');
});

test('FIX1: a duplicate "OUI" delivered AFTER the pending action was already consumed does not re-execute', async () => {
  const prismaService = new FakePrismaService();
  seedOwnedListing(prismaService);
  await seedPendingPause(prismaService, new Date().toISOString());

  const modelClient = new ScriptedModelClient([{ type: 'text', text: 'ok' }]);
  const { service } = buildService(prismaService, modelClient);

  await service.handleInboundMessage(inbound({ text: 'OUI', messageId: 'wamid.oui.1' }));
  await service.handleInboundMessage(inbound({ text: 'OUI', messageId: 'wamid.oui.2' }));

  const executedLogs = prismaService.supportActionLog.records.filter((r) => r.outcome === 'executed');
  assert.equal(executedLogs.length, 1);
  assert.equal(prismaService.listingLifecycleEvent.records.length, 1);
});

// ---------------------------------------------------------------------------
// FIX 2 — Pending-action TTL.
// ---------------------------------------------------------------------------

test('FIX2: a pending action older than the TTL plus a valid "OUI" does NOT mutate and returns the expiry message', async () => {
  const prismaService = new FakePrismaService();
  seedOwnedListing(prismaService);
  const staleCreatedAt = new Date(Date.now() - (PENDING_ACTION_TTL_MS + 60_000)).toISOString();
  const conversation = await seedPendingPause(prismaService, staleCreatedAt);

  const modelClient = new ScriptedModelClient([{ type: 'text', text: 'ok' }]);
  const { service, replySender } = buildService(prismaService, modelClient);

  await service.handleInboundMessage(inbound({ text: 'OUI', messageId: 'wamid.oui.stale' }));

  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'active', 'no mutation on an expired confirmation');
  assert.equal(replySender.sent.at(-1)?.body, PENDING_ACTION_EXPIRED_REPLY);
  assert.equal(conversation.pendingActionJson, null, 'the expired pending action is cleared');
  const executedLogs = prismaService.supportActionLog.records.filter((r) => r.outcome === 'executed');
  assert.equal(executedLogs.length, 0);
});

test('FIX2: a pending action within the TTL still executes normally', async () => {
  const prismaService = new FakePrismaService();
  seedOwnedListing(prismaService);
  await seedPendingPause(prismaService, new Date().toISOString());

  const modelClient = new ScriptedModelClient([{ type: 'text', text: 'ok' }]);
  const { service } = buildService(prismaService, modelClient);

  await service.handleInboundMessage(inbound({ text: 'OUI', messageId: 'wamid.oui.fresh' }));

  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'paused');
});

// ---------------------------------------------------------------------------
// FIX 3 — messageId idempotency.
// ---------------------------------------------------------------------------

test('FIX3: the same messageId delivered twice is processed once (no duplicate row, no duplicate model call)', async () => {
  const prismaService = new FakePrismaService();
  const modelClient = new ScriptedModelClient([{ type: 'text', text: 'Bonjour !' }]);
  const { service, replySender } = buildService(prismaService, modelClient);

  await service.handleInboundMessage(inbound({ text: 'Bonjour', messageId: 'wamid.dup' }));
  await service.handleInboundMessage(inbound({ text: 'Bonjour', messageId: 'wamid.dup' }));

  const inboundRows = prismaService.supportMessage.records.filter((r) => r.role === 'inbound');
  assert.equal(inboundRows.length, 1, 'only one inbound row is persisted');
  assert.equal(modelClient.calls.length, 1, 'the model is only called once');
  assert.equal(replySender.sent.length, 1, 'only one reply is sent');
});

test('FIX3: a unique-violation race on the same messageId is handled gracefully (processed once)', async () => {
  const prismaService = new FakePrismaService();
  const modelClient = new ScriptedModelClient([{ type: 'text', text: 'Bonjour !' }]);
  const { service } = buildService(prismaService, modelClient);

  // Both deliveries pass the pre-check (findUnique sees nothing) before either
  // create runs; the second create then hits the unique constraint.
  await Promise.all([
    service.handleInboundMessage(inbound({ text: 'Bonjour', messageId: 'wamid.race' })),
    service.handleInboundMessage(inbound({ text: 'Bonjour', messageId: 'wamid.race' })),
  ]);

  const inboundRows = prismaService.supportMessage.records.filter((r) => r.role === 'inbound');
  assert.equal(inboundRows.length, 1, 'the unique constraint keeps exactly one inbound row');
});

// ---------------------------------------------------------------------------
// FIX 4 — Error handling: a model outage never drops the customer.
// ---------------------------------------------------------------------------

test('FIX4: when the model throws, the customer still receives a graceful reply and handleInboundMessage does not throw', async () => {
  const prismaService = new FakePrismaService();
  const modelClient = new ThrowingModelClient();
  const { service, replySender } = buildService(prismaService, modelClient);

  await service.handleInboundMessage(inbound({ text: 'Bonjour', messageId: 'wamid.err' }));

  assert.equal(replySender.sent.length, 1);
  assert.equal(replySender.sent[0].body, MODEL_ERROR_REPLY);
});

test('FIX4: when the model throws AND the graceful reply also fails to send, handleInboundMessage still does not throw', async () => {
  const prismaService = new FakePrismaService();
  const modelClient = new ThrowingModelClient();
  const replySender = new FakeSupportReplySender();
  replySender.throwOnce = true;
  const { service } = buildService(prismaService, modelClient, replySender);

  await assert.doesNotReject(
    service.handleInboundMessage(inbound({ text: 'Bonjour', messageId: 'wamid.err2' })),
  );
});

// ---------------------------------------------------------------------------
// FIX 6 — Audit best-effort: a failing audit insert never undoes / re-throws.
// ---------------------------------------------------------------------------

test('FIX6: when the audit insert throws, the mutation result is still returned and nothing throws', async () => {
  const prismaService = new FakePrismaService();
  seedOwnedListing(prismaService);
  prismaService.supportActionLog.throwOnCreate = true;

  const pendingAction = {
    action: 'pauseListing',
    targetId: 'listing_own',
    waId: '32494998210',
    payload: {},
    createdAt: new Date().toISOString(),
  };

  const result = await executePendingAction(prismaService, '32494998210', pendingAction);

  assert.equal(result.outcome, 'executed', 'the mutation already applied; audit failure is swallowed');
  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'paused');
});

// ---------------------------------------------------------------------------
// FIX A — Nonce-scoped consume: a confirming request that read P1 can never
// clear/execute against a P2 that replaced it in between.
// ---------------------------------------------------------------------------

test('FIXA: a confirmation that read P1(n1) is a no-op once the pending action is replaced with P2(n2) before the consume — P1 does NOT execute and P2 is NOT cleared', async () => {
  const prismaService = new FakePrismaService();
  seedOwnedListing(prismaService);
  // Pending action P1, nonce n1 — this is what the confirming request reads.
  await seedPendingPause(prismaService, new Date().toISOString(), 'n1');

  const modelClient = new ScriptedModelClient([{ type: 'text', text: 'ok' }]);
  const { service } = buildService(prismaService, modelClient);

  // A DIFFERENT pending action P2 (nonce n2) that lands between this confirming
  // request's read and its updateMany consume.
  const p2 = {
    action: 'pauseListing',
    targetId: 'listing_own',
    waId: '32494998210',
    payload: {},
    createdAt: new Date().toISOString(),
  };

  const delegate = prismaService.supportConversation;
  const originalUpdateMany = delegate.updateMany.bind(delegate);
  let swapped = false;
  delegate.updateMany = async (args: Parameters<typeof originalUpdateMany>[0]) => {
    if (!swapped) {
      swapped = true;
      const record = delegate.records.find((r) => r.id === args.where.id);
      if (record) {
        record.pendingActionJson = p2;
        record.pendingActionNonce = 'n2';
      }
    }
    return originalUpdateMany(args);
  };

  await service.handleInboundMessage(inbound({ text: 'OUI', messageId: 'wamid.oui.p1' }));

  // P1 never executed (listing untouched, no executed log, no lifecycle event).
  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'active', 'P1 must not execute');
  const executedLogs = prismaService.supportActionLog.records.filter((r) => r.outcome === 'executed');
  assert.equal(executedLogs.length, 0, 'the captured P1 payload is not executed');
  assert.equal(prismaService.listingLifecycleEvent.records.length, 0, 'no lifecycle event fired');

  // P2 is left intact — the nonce-n1 consume matched nothing, so it cleared nothing.
  const record = delegate.records[0];
  assert.equal(record.pendingActionNonce, 'n2', 'P2 nonce is preserved');
  assert.equal(record.pendingActionJson, p2, 'P2 pending action is preserved (not cleared)');
});

// ---------------------------------------------------------------------------
// FIX B — Silent send failures: a reply sender returning null (non-2xx, no
// throw) is logged by safeSendText and never throws.
// ---------------------------------------------------------------------------

test('FIXB: when sendText resolves null (non-2xx), safeSendText logs a warning and does not throw', async () => {
  const prismaService = new FakePrismaService();
  const modelClient = new ScriptedModelClient([{ type: 'text', text: 'Bonjour !' }]);
  const replySender = new FakeSupportReplySender();
  replySender.returnNull = true;
  const { service } = buildService(prismaService, modelClient, replySender);

  const originalWarn = console.warn;
  const warnings: unknown[][] = [];
  // eslint-disable-next-line no-console
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    await assert.doesNotReject(
      service.handleInboundMessage(inbound({ text: 'Bonjour', messageId: 'wamid.nullsend' })),
    );
  } finally {
    // eslint-disable-next-line no-console
    console.warn = originalWarn;
  }

  assert.equal(replySender.sent.length, 0, 'the null-returning send recorded nothing as sent');
  assert.ok(
    warnings.some((entry) => typeof entry[0] === 'string' && entry[0].includes('reply send reported no result')),
    'a warning about the failed send is logged',
  );
});

// ---------------------------------------------------------------------------
// Daily cost ceiling (SUPPORT_AGENT_DAILY_LIMIT)
//
// The per-conversation rate limit bounds ONE sender to 5 inbound messages a
// minute; nothing bounds how many senders exist. Since each model-driven turn
// costs up to 1 + MAX_TOOL_TURNS paid Claude calls, the daily cap is what
// actually bounds the bill.
// ---------------------------------------------------------------------------

test('daily cap: once the budget is spent the model is never called again', async () => {
  const prismaService = new FakePrismaService();
  const modelClient = new ScriptedModelClient([{ text: 'Bonjour !', type: 'text' }]);
  const { service, replySender } = buildService(
    prismaService,
    modelClient,
    new FakeSupportReplySender(),
    undefined,
    2,
  );

  await service.handleInboundMessage(inbound({ messageId: 'wamid.a' }));
  await service.handleInboundMessage(inbound({ messageId: 'wamid.b' }));
  assert.equal(modelClient.calls.length, 2, 'the first two turns are within budget');

  await service.handleInboundMessage(inbound({ messageId: 'wamid.c' }));

  assert.equal(modelClient.calls.length, 2, 'the third turn never reaches the paid model');
  assert.equal(
    replySender.sent.at(-1)?.body,
    DAILY_LIMIT_NOTICE,
    'the customer is told support is at capacity rather than being dropped silently',
  );

  const conversation = prismaService.supportConversation.records[0];
  const persisted = prismaService.supportMessage.records.filter(
    (record) => record.conversationId === conversation.id && record.role === 'agent',
  );
  assert.equal(
    persisted.at(-1)?.body,
    DAILY_LIMIT_NOTICE,
    'the capacity notice is persisted, so the conversation history stays honest',
  );
});

test('daily cap: a spent budget still lets an already-confirmed action execute', async () => {
  const prismaService = new FakePrismaService();
  seedOwnedListing(prismaService);
  const modelClient = new ScriptedModelClient([{ text: 'Bonjour !', type: 'text' }]);
  const { service, replySender } = buildService(
    prismaService,
    modelClient,
    new FakeSupportReplySender(),
    undefined,
    1,
  );

  // Burn the single unit of budget on one ordinary turn.
  await service.handleInboundMessage(inbound({ messageId: 'wamid.a' }));
  assert.equal(modelClient.calls.length, 1);

  await seedPendingPause(prismaService, new Date().toISOString(), 'nonce_confirm');
  await service.handleInboundMessage(inbound({ messageId: 'wamid.b', text: 'OUI' }));

  assert.equal(modelClient.calls.length, 1, 'confirming costs no model call at all');
  assert.notEqual(
    replySender.sent.at(-1)?.body,
    DAILY_LIMIT_NOTICE,
    'a spent budget must never strand a customer mid-confirmation',
  );

  const listing = prismaService.listing.records.find((record) => record.id === 'listing_own');
  assert.equal(listing?.lifecycleStatus, 'paused', 'the confirmed action really executed');
});

test('daily budget: the counter rolls over on a new UTC day instead of latching', () => {
  const state: DailyModelBudgetState = { count: 0, dayKey: '' };

  assert.equal(consumeDailyModelBudget(state, new Date('2026-08-31T23:59:00Z'), 2), true);
  assert.equal(consumeDailyModelBudget(state, new Date('2026-08-31T23:59:30Z'), 2), true);
  assert.equal(
    consumeDailyModelBudget(state, new Date('2026-08-31T23:59:59Z'), 2),
    false,
    "the day's budget is spent",
  );

  assert.equal(
    consumeDailyModelBudget(state, new Date('2026-09-01T00:00:01Z'), 2),
    true,
    'the next UTC day starts from a fresh budget',
  );
  assert.equal(state.count, 1);
});
