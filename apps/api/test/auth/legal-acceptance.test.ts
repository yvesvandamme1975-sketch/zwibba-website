import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createLegalPolicy } from '../../assets/legal/catalog.mjs';
import { AuthService } from '../../src/auth/auth.service';

function policyFixture() {
  const documents: Record<string, string> = {};
  const entries = [];
  for (const locale of ['fr-BE', 'nl-BE', 'fr-CD']) for (const kind of ['terms', 'privacy', 'legal-notice']) {
    const file = `2026-09-07/${kind}.${locale}.md`;
    documents[file] = `# Conditions de test ${locale} ${kind}`;
    entries.push({ kind, locale, market: locale.slice(-2), file, sha256: createHash('sha256').update(documents[file]).digest('hex') });
  }
  return createLegalPolicy({ manifest: { status: 'published', version: '2026-09-07', effectiveAt: '2026-09-07', documents: entries }, documents, now: new Date('2026-09-08') });
}

class MemoryPrisma {
  users: any[] = [];
  sessions: any[] = [];
  acceptances: any[] = [];
  failAcceptance = false;
  transactions = 0;
  user = {
    upsert: async ({ create }: any) => {
      let user = this.users.find(item => item.phoneNumber === create.phoneNumber);
      if (!user) { user = { id: `user-${this.users.length}`, ...create }; this.users.push(user); }
      return user;
    },
    findUnique: async ({ where }: any) => this.users.find(item => item.phoneNumber === where.phoneNumber || item.id === where.id) ?? null,
  };
  session = {
    create: async ({ data }: any) => { this.sessions.push(data); return data; },
    findUnique: async ({ where }: any) => {
      const session = this.sessions.find(item => item.token === where.token);
      return session ? { ...session, user: this.users.find(item => item.id === session.userId) } : null;
    },
  };
  verificationAttempt = { updateMany: async () => ({ count: 1 }), count: async () => 0, create: async () => ({}) };
  termsAcceptance = {
    upsert: async ({ create }: any) => {
      if (this.failAcceptance) throw new Error('Ledger unavailable');
      const existing = this.acceptances.find(item => ['userId', 'version', 'documentHash', 'locale', 'market'].every(key => item[key] === create[key]));
      if (existing) return existing;
      const record = { ...create, acceptedAt: new Date('2026-09-08T12:00:00Z') };
      this.acceptances.push(record); return record;
    },
    findFirst: async ({ where }: any) => this.acceptances.find(item => item.userId === where.userId && item.market === where.market && item.version === where.version && where.OR.some((choice: any) => choice.locale === item.locale && choice.documentHash === item.documentHash)) ?? null,
  };
  async $transaction(callback: (tx: this) => Promise<any>) {
    this.transactions++;
    const snapshot = structuredClone({ users: this.users, sessions: this.sessions, acceptances: this.acceptances });
    try { return await callback(this); }
    catch (error) { Object.assign(this, snapshot); throw error; }
  }
}

function setup(t: any, active = true) {
  const snapshot = { ...process.env };
  Object.assign(process.env, {
    APP_BASE_URL: 'https://zwibba.example/App/', AI_PROVIDER: 'stub', DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/test',
    OTP_PROVIDER: 'demo', DEMO_OTP_ALLOWLIST: '+32499000001', DEMO_OTP_CODE: '123456', NODE_ENV: 'test',
    R2_ACCESS_KEY_ID: 'test', R2_ACCOUNT_ID: 'test', R2_BUCKET: 'test', R2_PUBLIC_BASE_URL: 'https://cdn.example', R2_SECRET_ACCESS_KEY: 'test',
    R2_S3_ENDPOINT: 'https://r2.example', ZWIBBA_ADMIN_SHARED_SECRET: 'test',
  });
  t.after(() => { for (const key of Object.keys(process.env)) if (!(key in snapshot)) delete process.env[key]; Object.assign(process.env, snapshot); });
  const prisma = new MemoryPrisma();
  let otpCalls = 0;
  const otp = { checkVerification: async () => { otpCalls++; return { status: 'approved', sid: 'test' }; }, requestVerification: async () => ({ status: 'pending', sid: 'test' }) };
  const policy = active ? policyFixture() : createLegalPolicy({ manifest: { status: 'draft', version: 'draft-2026-09-07', documents: [] }, documents: {} });
  const service: any = new (AuthService as any)(prisma, otp, policy);
  const terms = policy.termsFor('BE');
  const acceptance = terms ? { accepted: true, version: terms.version, hash: terms.hash, locale: terms.locale } : undefined;
  return { service, prisma, policy, acceptance, otpCalls: () => otpCalls };
}

test('active CGU require an explicit acceptance before consuming OTP', async t => {
  const { service, prisma, otpCalls } = setup(t);
  await assert.rejects(() => service.verifyOtp({ phoneNumber: '+32499000001', code: '123456' }), /conditions|CGU/i);
  assert.equal(otpCalls(), 0);
  assert.equal(prisma.users.length, 0);
  assert.equal(prisma.sessions.length, 0);
});

test('stale document hash and invalid market locale cannot consume OTP or bypass terms', async t => {
  const { service, acceptance, otpCalls } = setup(t);
  for (const changed of [{ hash: 'old' }, { version: 'old' }, { locale: 'fr-CD' }, { accepted: false }]) {
    await assert.rejects(() => service.verifyOtp({ phoneNumber: '+32499000001', code: '123456', legalAcceptance: { ...acceptance, ...changed } }));
  }
  assert.equal(otpCalls(), 0);
});

test('account, exact terms snapshot and session are created in one transaction', async t => {
  const { service, prisma, policy, acceptance } = setup(t);
  const session = await service.verifyOtp({ phoneNumber: '+32499000001', code: '123456', legalAcceptance: acceptance });
  assert.equal(prisma.transactions, 1);
  assert.equal(prisma.acceptances.length, 1);
  assert.equal(prisma.sessions[0].userId, prisma.acceptances[0].userId);
  assert.equal(prisma.acceptances[0].documentText, policy.termsFor('BE')!.content);
  assert.equal(prisma.acceptances[0].documentHash, acceptance!.hash);
  assert.equal(session.phoneNumber, '+32499000001');
});

test('a ledger failure cannot leave a newly created account or usable session', async t => {
  const { service, prisma, acceptance } = setup(t);
  prisma.failAcceptance = true;
  await assert.rejects(() => service.verifyOtp({ phoneNumber: '+32499000001', code: '123456', legalAcceptance: acceptance }), /Ledger/);
  assert.equal(prisma.users.length, 0);
  assert.equal(prisma.sessions.length, 0);
});

test('existing session can read and accept required terms without circular authentication', async t => {
  const { service, prisma, acceptance } = setup(t);
  const session = await service.verifyOtp({ phoneNumber: '+32499000001', code: '123456', legalAcceptance: acceptance });
  prisma.acceptances = [];
  const status = await service.getLegalStatus(session.sessionToken);
  assert.equal(status.needsAcceptance, true);
  assert.match(status.terms.url, /^https:\/\/zwibba.example\/legal\/fr-BE\/terms\/$/);
  await assert.rejects(() => service.requireSessionToken(session.sessionToken), (error: any) => error.getStatus() === 428);
  await service.acceptTerms(session.sessionToken, acceptance);
  assert.equal((await service.getLegalStatus(session.sessionToken)).needsAcceptance, false);
  assert.equal((await service.requireSessionToken(session.sessionToken)).phoneNumber, '+32499000001');
  const original = prisma.acceptances[0].acceptedAt;
  await service.acceptTerms(session.sessionToken, acceptance);
  assert.equal(prisma.acceptances.length, 1);
  assert.equal(prisma.acceptances[0].acceptedAt, original);
});

test('accepting the current Dutch text does not demand French acceptance too', async t => {
  const { service, policy } = setup(t);
  const terms = policy.termsFor('BE', 'nl-BE')!;
  const session = await service.verifyOtp({ phoneNumber: '+32499000001', code: '123456', legalAcceptance: { accepted: true, version: terms.version, hash: terms.hash, locale: terms.locale } });
  assert.equal((await service.getLegalStatus(session.sessionToken)).needsAcceptance, false);
});

test('inactive draft catalog leaves login unchanged and records no fictional acceptance', async t => {
  const { service, prisma } = setup(t, false);
  const session = await service.verifyOtp({ phoneNumber: '+32499000001', code: '123456' });
  assert.equal(prisma.acceptances.length, 0);
  assert.equal((await service.getLegalStatus(session.sessionToken)).active, false);
});
