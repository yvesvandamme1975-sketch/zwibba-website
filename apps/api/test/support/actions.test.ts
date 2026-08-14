import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACCOUNT_TOOL_NAMES,
  executePendingAction,
  MARK_LISTING_SOLD_TOOL,
  MUTATING_ACCOUNT_TOOL_NAMES,
  NO_ACCOUNT_REFUSAL,
  OWNERSHIP_REFUSAL,
  PAUSE_LISTING_TOOL,
  runAccountTool,
  UNPAUSE_LISTING_TOOL,
  UPDATE_LISTING_PRICE_TOOL,
  type SupportToolsPrismaClient,
} from '../../src/support/support-tools';
import {
  DEFAULT_SUPPORT_AGENT_RATE_LIMIT,
  SupportAgentService,
  type SupportModelClient,
  type SupportModelMessage,
  type SupportModelReply,
} from '../../src/support/support-agent.service';
import type { InboundWhatsappMessage } from '../../src/support/support.controller';

// ---------------------------------------------------------------------------
// Fakes — mirror the pattern used in test/support/tools-auth.test.ts, plus
// the extra delegates Task 10 needs: listing.findUnique/update,
// listingLifecycleEvent.create, supportConversation.update, and
// supportActionLog.create for the audit trail.
// ---------------------------------------------------------------------------

type FakeUserRecord = { id: string; phoneNumber: string; displayName?: string | null };

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
  deletedBySellerAt?: Date | null;
  deletedReason?: string | null;
  previousLifecycleStatusBeforeDelete?: string | null;
  lifecycleChangedAt?: Date | null;
};

function listingRecord(overrides: Partial<FakeListingRecord> & { id: string; ownerPhoneNumber: string; title: string }): FakeListingRecord {
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

type FakeLifecycleEventRecord = { id: string } & Record<string, unknown>;

class FakeListingLifecycleEventDelegate {
  records: FakeLifecycleEventRecord[] = [];
  private nextId = 1;

  async create({ data }: { data: Record<string, unknown> }) {
    const record = { id: `event_${this.nextId++}`, ...data };
    this.records.push(record);
    return record;
  }
}

type FakeSupportActionLogRecord = { id: string } & Record<string, unknown>;

class FakeSupportActionLogDelegate {
  records: FakeSupportActionLogRecord[] = [];
  private nextId = 1;

  async create({ data }: { data: Record<string, unknown> }) {
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
      pendingActionJson: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.push(record);

    return record;
  }

  async update({
    where,
    data,
  }: {
    where: { id: string };
    data: { pendingActionJson: unknown };
  }) {
    const record = this.records.find((item) => item.id === where.id);
    if (!record) {
      throw new Error(`FakeSupportConversationDelegate.update: no record ${where.id}`);
    }
    record.pendingActionJson = data.pendingActionJson;
    record.updatedAt = new Date();
    return record;
  }
}

type SupportMessageRecord = {
  id: string;
  conversationId: string;
  role: string;
  body: string;
  createdAt: Date;
};

class FakeSupportMessageDelegate {
  records: SupportMessageRecord[] = [];
  private nextId = 1;

  async create({ data }: { data: { conversationId: string; role: string; body: string } }) {
    const record: SupportMessageRecord = {
      id: `message_${this.nextId++}`,
      conversationId: data.conversationId,
      role: data.role,
      body: data.body,
      createdAt: new Date(),
    };
    this.records.push(record);
    return record;
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

class FakeActionsPrismaService implements SupportToolsPrismaClient {
  readonly user = new FakeUserDelegate();
  readonly listing = new FakeListingDelegate();
  readonly listingLifecycleEvent = new FakeListingLifecycleEventDelegate();
  readonly supportActionLog = new FakeSupportActionLogDelegate();
  readonly supportConversation = new FakeSupportConversationDelegate();
  readonly supportMessage = new FakeSupportMessageDelegate();
}

class ScriptedModelClient implements SupportModelClient {
  readonly calls: Array<{ system: string; messages: SupportModelMessage[]; tools?: unknown[] }> = [];

  constructor(private readonly replies: SupportModelReply[]) {}

  async generateReply(input: {
    system: string;
    messages: SupportModelMessage[];
    tools?: unknown[];
  }): Promise<SupportModelReply> {
    this.calls.push(input);
    const index = Math.min(this.calls.length - 1, this.replies.length - 1);
    return this.replies[index];
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
  readonly calls: Array<{ waId: string; reason: string; summary: string; history: unknown[] }> = [];

  async escalate(input: { waId: string; reason: string; summary: string; history: unknown[] }) {
    this.calls.push(input);
    return true;
  }
}

function inbound(overrides: Partial<InboundWhatsappMessage> = {}): InboundWhatsappMessage {
  return {
    waId: '32494998210',
    text: 'Peux-tu mettre en pause mon annonce ?',
    messageId: 'wamid.1',
    ...overrides,
  };
}

function buildService(prismaService: FakeActionsPrismaService, modelClient: SupportModelClient) {
  const replySender = new FakeSupportReplySender();
  const escalationService = new FakeSupportEscalationService();
  const service = new SupportAgentService(
    prismaService as any,
    modelClient,
    replySender as any,
    escalationService as any,
    DEFAULT_SUPPORT_AGENT_RATE_LIMIT,
  );
  return { service, replySender, escalationService };
}

// ---------------------------------------------------------------------------
// (a) Ownership: a target belonging to another account is refused, without
// mutating anything, and the refusal is logged.
// ---------------------------------------------------------------------------

test('ownership: pauseListing on a listing owned by a DIFFERENT account is refused, mutates nothing, and is logged', async () => {
  const prismaService = new FakeActionsPrismaService();
  prismaService.user.records.push({ id: 'user_1', phoneNumber: '+32494998210' });
  prismaService.listing.records.push(
    listingRecord({ id: 'listing_other', ownerPhoneNumber: '+32499111222', title: "Annonce d'un autre vendeur" }),
  );

  const result = await runAccountTool(
    prismaService,
    PAUSE_LISTING_TOOL.name,
    '32494998210',
    { listingId: 'listing_other' },
    'conversation_x',
  );

  assert.equal(result, OWNERSHIP_REFUSAL);
  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'active', 'no mutation happened');

  assert.equal(prismaService.supportActionLog.records.length, 1);
  const logEntry = prismaService.supportActionLog.records[0];
  assert.equal(logEntry.waId, '32494998210');
  assert.equal(logEntry.matchedPhoneNumber, '+32494998210');
  assert.equal(logEntry.action, 'pauseListing');
  assert.equal(logEntry.targetId, 'listing_other');
  assert.equal(logEntry.outcome, 'refused_ownership');
});

test('ownership: markListingSold with no account for the wa_id is refused and logged, without a listing lookup leaking data', async () => {
  const prismaService = new FakeActionsPrismaService();
  prismaService.listing.records.push(
    listingRecord({ id: 'listing_someone_elses', ownerPhoneNumber: '+32499111222', title: 'Secret annonce' }),
  );

  const result = await runAccountTool(
    prismaService,
    MARK_LISTING_SOLD_TOOL.name,
    '32400000000',
    { listingId: 'listing_someone_elses' },
    'conversation_x',
  );

  assert.equal(result, NO_ACCOUNT_REFUSAL);
  assert.doesNotMatch(result, /Secret annonce/);
  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'active');

  assert.equal(prismaService.supportActionLog.records.length, 1);
  assert.equal(prismaService.supportActionLog.records[0].outcome, 'refused_no_account');
  assert.equal(prismaService.supportActionLog.records[0].matchedPhoneNumber, null);
});

// ---------------------------------------------------------------------------
// (b) Confirmation flow: first call sets pending + asks; only "OUI" from the
// SAME wa_id executes; and it executes the RIGHT action.
// ---------------------------------------------------------------------------

test('confirmation: first pauseListing call does NOT mutate, stores a pending action, and asks to confirm', async () => {
  const prismaService = new FakeActionsPrismaService();
  prismaService.user.records.push({ id: 'user_1', phoneNumber: '+32494998210' });
  prismaService.listing.records.push(
    listingRecord({ id: 'listing_own', ownerPhoneNumber: '+32494998210', title: 'Mon vélo' }),
  );
  const conversation = await prismaService.supportConversation.upsert({
    where: { waId: '32494998210' },
    create: { waId: '32494998210' },
    update: {},
  });

  const result = await runAccountTool(
    prismaService,
    PAUSE_LISTING_TOOL.name,
    '32494998210',
    { listingId: 'listing_own' },
    conversation.id,
  );

  assert.match(result, /Confirmez/);
  assert.match(result, /OUI/);
  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'active', 'no mutation before confirmation');

  const stored = conversation.pendingActionJson as any;
  assert.equal(stored.action, 'pauseListing');
  assert.equal(stored.targetId, 'listing_own');
  assert.equal(stored.waId, '32494998210');

  const pendingLog = prismaService.supportActionLog.records.find((r) => r.outcome === 'pending_confirmation');
  assert.ok(pendingLog, 'the request-phase is itself logged');
});

test('confirmation: executePendingAction with "OUI" from the SAME wa_id executes the RIGHT action (pause) and audits it', async () => {
  const prismaService = new FakeActionsPrismaService();
  prismaService.user.records.push({ id: 'user_1', phoneNumber: '+32494998210' });
  prismaService.listing.records.push(
    listingRecord({ id: 'listing_own', ownerPhoneNumber: '+32494998210', title: 'Mon vélo' }),
  );

  const pendingAction = {
    action: 'pauseListing',
    targetId: 'listing_own',
    waId: '32494998210',
    payload: {},
    createdAt: new Date().toISOString(),
  };

  const result = await executePendingAction(prismaService, '32494998210', pendingAction);

  assert.equal(result.outcome, 'executed');
  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'paused');
  assert.ok(prismaService.listing.records[0].pausedAt, 'pausedAt is set by the reused lifecycle logic');

  const executedLog = prismaService.supportActionLog.records.find((r) => r.outcome === 'executed');
  assert.ok(executedLog);
  assert.equal(executedLog!.action, 'pauseListing');
  assert.equal(executedLog!.targetId, 'listing_own');
  assert.equal(executedLog!.matchedPhoneNumber, '+32494998210');

  // Exactly one ListingLifecycleEvent — reused from listing-lifecycle.ts.
  assert.equal(prismaService.listingLifecycleEvent.records.length, 1);
  assert.equal(prismaService.listingLifecycleEvent.records[0].action, 'paused');
});

test('confirmation: executePendingAction executes updateListingPrice with the exact stored payload', async () => {
  const prismaService = new FakeActionsPrismaService();
  prismaService.user.records.push({ id: 'user_1', phoneNumber: '+32494998210' });
  prismaService.listing.records.push(
    listingRecord({ id: 'listing_own', ownerPhoneNumber: '+32494998210', title: 'Ma table', priceAmount: 50, priceCurrency: 'EUR' }),
  );

  const pendingAction = {
    action: 'updateListingPrice',
    targetId: 'listing_own',
    waId: '32494998210',
    payload: { newPriceAmount: 75, newPriceCurrency: 'EUR' },
    createdAt: new Date().toISOString(),
  };

  const result = await executePendingAction(prismaService, '32494998210', pendingAction);

  assert.equal(result.outcome, 'executed');
  assert.equal(prismaService.listing.records[0].priceAmount, 75);
  assert.equal(prismaService.listing.records[0].priceCurrency, 'EUR');
  // updateListingPrice is a plain field update, not a lifecycle transition.
  assert.equal(prismaService.listingLifecycleEvent.records.length, 0);
});

test('confirmation, full end-to-end via handleInboundMessage: request turn asks, then a plain "OUI" reply (no model call) executes markListingSold', async () => {
  const prismaService = new FakeActionsPrismaService();
  prismaService.user.records.push({ id: 'user_1', phoneNumber: '+32494998210' });
  prismaService.listing.records.push(
    listingRecord({ id: 'listing_own', ownerPhoneNumber: '+32494998210', title: 'Mon vélo' }),
  );

  const modelClient = new ScriptedModelClient([
    { type: 'tool_use', id: 'toolu_1', name: 'markListingSold', input: { listingId: 'listing_own' } },
    { type: 'text', text: 'Confirmez : marquer comme vendue ? Répondez OUI.' },
  ]);
  const { service, replySender } = buildService(prismaService, modelClient);

  await service.handleInboundMessage(inbound({ text: 'Marque mon vélo comme vendu' }));

  assert.equal(modelClient.calls.length, 2);
  assert.equal(replySender.sent.length, 1);
  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'active', 'not sold yet — awaiting confirmation');

  const conversationAfterRequest = prismaService.supportConversation.records[0];
  assert.ok(conversationAfterRequest.pendingActionJson, 'pending action is stored on the conversation');

  // Second, separate inbound message: the customer confirms. The model must
  // NOT be called again for this turn — execution is deterministic from the
  // stored pending action, not from a fresh model tool call.
  await service.handleInboundMessage(inbound({ text: 'OUI', messageId: 'wamid.2' }));

  assert.equal(modelClient.calls.length, 2, 'the model is never called again to confirm');
  assert.equal(replySender.sent.length, 2);
  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'sold');
  assert.equal(prismaService.listing.records[0].soldChannel, 'sold_on_zwibba');

  const conversationAfterConfirm = prismaService.supportConversation.records[0];
  assert.equal(conversationAfterConfirm.pendingActionJson, null, 'pending action is cleared after execution');

  const executedLog = prismaService.supportActionLog.records.find((r) => r.outcome === 'executed');
  assert.ok(executedLog);
  assert.equal(executedLog!.action, 'markListingSold');
});

test('confirmation: a non-"OUI" reply after a pending action does NOT execute it, and clears the pending state', async () => {
  const prismaService = new FakeActionsPrismaService();
  prismaService.user.records.push({ id: 'user_1', phoneNumber: '+32494998210' });
  prismaService.listing.records.push(
    listingRecord({ id: 'listing_own', ownerPhoneNumber: '+32494998210', title: 'Mon vélo' }),
  );

  const modelClient = new ScriptedModelClient([
    { type: 'tool_use', id: 'toolu_1', name: 'pauseListing', input: { listingId: 'listing_own' } },
    { type: 'text', text: 'Confirmez la mise en pause ? Répondez OUI.' },
    { type: 'text', text: "D'accord, je ne fais rien." },
  ]);
  const { service, replySender } = buildService(prismaService, modelClient);

  await service.handleInboundMessage(inbound({ text: 'Mets mon annonce en pause stp' }));
  await service.handleInboundMessage(inbound({ text: 'Non merci finalement', messageId: 'wamid.2' }));

  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'active', 'declining never mutates');
  assert.equal(modelClient.calls.length, 3, 'the second, non-confirming message goes back through the model normally');
  const conversationAfterDecline = prismaService.supportConversation.records[0];
  assert.equal(conversationAfterDecline.pendingActionJson, null);
});

// ---------------------------------------------------------------------------
// (c) Stale/mismatched pending actions never mis-fire.
// ---------------------------------------------------------------------------

test('stale pending: executePendingAction refuses when the pending action was minted for a DIFFERENT wa_id, and mutates nothing', async () => {
  const prismaService = new FakeActionsPrismaService();
  prismaService.user.records.push({ id: 'user_1', phoneNumber: '+32494998210' });
  prismaService.listing.records.push(
    listingRecord({ id: 'listing_own', ownerPhoneNumber: '+32494998210', title: 'Mon vélo' }),
  );

  // A pending action minted for a DIFFERENT number than the one confirming.
  const pendingAction = {
    action: 'pauseListing',
    targetId: 'listing_own',
    waId: '32499999999',
    payload: {},
    createdAt: new Date().toISOString(),
  };

  const result = await executePendingAction(prismaService, '32494998210', pendingAction);

  assert.equal(result.outcome, 'refused_invalid_pending');
  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'active');

  const staleLog = prismaService.supportActionLog.records.find((r) => r.outcome === 'refused_stale_pending');
  assert.ok(staleLog, 'the mismatch is logged');
});

test('stale pending: a malformed/garbage pendingActionJson is refused, never crashes, and mutates nothing', async () => {
  const prismaService = new FakeActionsPrismaService();
  prismaService.user.records.push({ id: 'user_1', phoneNumber: '+32494998210' });
  prismaService.listing.records.push(
    listingRecord({ id: 'listing_own', ownerPhoneNumber: '+32494998210', title: 'Mon vélo' }),
  );

  for (const garbage of [null, {}, { action: 'deleteAccount', targetId: 'listing_own', waId: '32494998210', payload: {} }, 'not-an-object']) {
    const result = await executePendingAction(prismaService, '32494998210', garbage);
    assert.equal(result.outcome, 'refused_invalid_pending');
  }

  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'active');
});

test('stale pending: ownership re-verified AT CONFIRM TIME — a listing that changed owner between request and confirm is refused', async () => {
  const prismaService = new FakeActionsPrismaService();
  prismaService.user.records.push({ id: 'user_1', phoneNumber: '+32494998210' });
  prismaService.listing.records.push(
    // The listing now belongs to someone else by the time confirmation runs.
    listingRecord({ id: 'listing_own', ownerPhoneNumber: '+32499111222', title: 'Mon vélo' }),
  );

  const pendingAction = {
    action: 'pauseListing',
    targetId: 'listing_own',
    waId: '32494998210',
    payload: {},
    createdAt: new Date().toISOString(),
  };

  const result = await executePendingAction(prismaService, '32494998210', pendingAction);

  assert.equal(result.outcome, 'refused_ownership');
  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'active');
});

// ---------------------------------------------------------------------------
// (d) Audit row written on every execute — also exercised above; this test
// pins the exact shape of an executed row for updateListingPrice.
// ---------------------------------------------------------------------------

test('audit: an executed action writes exactly one SupportActionLog row with waId, matchedPhoneNumber, action, targetId, payloadJson, outcome', async () => {
  const prismaService = new FakeActionsPrismaService();
  prismaService.user.records.push({ id: 'user_1', phoneNumber: '+32494998210' });
  prismaService.listing.records.push(
    listingRecord({ id: 'listing_own', ownerPhoneNumber: '+32494998210', title: 'Ma table', priceAmount: 50, priceCurrency: 'EUR' }),
  );

  const pendingAction = {
    action: 'updateListingPrice',
    targetId: 'listing_own',
    waId: '32494998210',
    payload: { newPriceAmount: 42, newPriceCurrency: 'EUR' },
    createdAt: new Date().toISOString(),
  };

  await executePendingAction(prismaService, '32494998210', pendingAction);

  const executedLogs = prismaService.supportActionLog.records.filter((r) => r.outcome === 'executed');
  assert.equal(executedLogs.length, 1);
  const row = executedLogs[0];
  assert.equal(row.waId, '32494998210');
  assert.equal(row.matchedPhoneNumber, '+32494998210');
  assert.equal(row.action, 'updateListingPrice');
  assert.equal(row.targetId, 'listing_own');
  assert.deepEqual(row.payloadJson, { newPriceAmount: 42, newPriceCurrency: 'EUR' });
});

// ---------------------------------------------------------------------------
// (e) Allowlist exhaustiveness — the highest-risk assertion in this file.
// ---------------------------------------------------------------------------

test('allowlist: MUTATING_ACCOUNT_TOOL_NAMES contains EXACTLY the 4 reversible self-only actions, nothing more', () => {
  assert.equal(MUTATING_ACCOUNT_TOOL_NAMES.size, 4);
  assert.ok(MUTATING_ACCOUNT_TOOL_NAMES.has('pauseListing'));
  assert.ok(MUTATING_ACCOUNT_TOOL_NAMES.has('unpauseListing'));
  assert.ok(MUTATING_ACCOUNT_TOOL_NAMES.has('markListingSold'));
  assert.ok(MUTATING_ACCOUNT_TOOL_NAMES.has('updateListingPrice'));
});

test('allowlist: ACCOUNT_TOOL_NAMES (read + write) has exactly 5 entries — getMyListings plus the 4 mutating actions', () => {
  assert.equal(ACCOUNT_TOOL_NAMES.size, 5);
});

test('allowlist: no destructive or sensitive action is reachable — no delete-account, no OTP-resend, no phone-number change, no cross-account action', () => {
  const forbiddenNames = [
    'deleteAccount',
    'deleteUser',
    'closeAccount',
    'resendOtp',
    'sendOtp',
    'verifyOtp',
    'changePhoneNumber',
    'updatePhoneNumber',
    'setPhoneNumber',
    'deleteListing',
    'transferListing',
    'setOwner',
    'changeOwner',
    'impersonate',
    'setListingOwner',
  ];

  for (const forbiddenName of forbiddenNames) {
    assert.equal(
      ACCOUNT_TOOL_NAMES.has(forbiddenName),
      false,
      `${forbiddenName} must never be a reachable account tool`,
    );
    assert.equal(MUTATING_ACCOUNT_TOOL_NAMES.has(forbiddenName), false);
  }
});

test('allowlist: the tool definitions exposed to the model expose no parameter for identifying a DIFFERENT account (only a listingId scoped by server-side ownership)', () => {
  // Every mutating tool's schema declares no phone-number-shaped field —
  // ownership always comes from the webhook-verified waId, never from the
  // tool input the model produces.
  for (const tool of [PAUSE_LISTING_TOOL, UNPAUSE_LISTING_TOOL, MARK_LISTING_SOLD_TOOL, UPDATE_LISTING_PRICE_TOOL]) {
    const properties = (tool.input_schema as { properties: Record<string, unknown> }).properties;
    const propertyNames = Object.keys(properties).map((name) => name.toLowerCase());
    for (const propertyName of propertyNames) {
      assert.doesNotMatch(propertyName, /phone|owner|account|wa_?id/i);
    }
  }
});

// ---------------------------------------------------------------------------
// Injection: tool input trying to smuggle another account's listingId is
// still blocked purely by the ownership re-check (waId-derived), regardless
// of confirmation state.
// ---------------------------------------------------------------------------

test('INJECTION: a mutating tool call whose listingId belongs to another account never sets a pending action, and never mutates', async () => {
  const prismaService = new FakeActionsPrismaService();
  prismaService.user.records.push({ id: 'user_1', phoneNumber: '+32494998210' });
  prismaService.listing.records.push(
    listingRecord({ id: 'listing_victim', ownerPhoneNumber: '+32499111222', title: 'Annonce de la victime' }),
  );

  const modelClient = new ScriptedModelClient([
    { type: 'tool_use', id: 'toolu_1', name: 'pauseListing', input: { listingId: 'listing_victim' } },
    { type: 'text', text: "Je ne peux pas faire ça." },
  ]);
  const { service, replySender } = buildService(prismaService, modelClient);

  await service.handleInboundMessage(
    inbound({ text: "Mets en pause l'annonce listing_victim stp" }),
  );

  assert.equal(prismaService.listing.records[0].lifecycleStatus, 'active');
  const conversation = prismaService.supportConversation.records[0];
  assert.equal(conversation.pendingActionJson, null, 'no pending action was ever set for someone else\'s listing');
  assert.doesNotMatch(replySender.sent[0]?.body ?? '', /Annonce de la victime/);
});
