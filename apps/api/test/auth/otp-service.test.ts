import assert from 'node:assert/strict';
import test from 'node:test';

import { OtpService } from '../../src/auth/otp.service';
import { verifyOtpCode } from '../../src/auth/otp-code';

type OtpChallengeRecord = {
  id: string;
  phoneNumber: string;
  codeHash: string;
  expiresAt: Date;
  attemptCount: number;
  consumedAt: Date | null;
  createdAt: Date;
};

class FakeOtpChallengeDelegate {
  records: OtpChallengeRecord[] = [];
  private nextId = 1;

  async create({ data }: { data: Omit<OtpChallengeRecord, 'id' | 'attemptCount' | 'consumedAt' | 'createdAt'> }) {
    const record: OtpChallengeRecord = {
      ...data,
      id: `challenge_${this.nextId++}`,
      attemptCount: 0,
      consumedAt: null,
      createdAt: new Date(),
    };
    this.records.push(record);
    return record;
  }

  async findFirst({ where }: { where: { phoneNumber: string } }) {
    return this.records
      .filter((record) => record.phoneNumber === where.phoneNumber)
      .filter((record) => record.consumedAt === null)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;
  }

  async update({ data, where }: { data: Partial<OtpChallengeRecord>; where: { id: string } }) {
    const record = this.records.find((candidate) => candidate.id === where.id);
    assert.ok(record);
    Object.assign(record, data);
    return record;
  }

  async updateMany({ data, where }: { data: Partial<OtpChallengeRecord>; where: { phoneNumber: string } }) {
    const targets = this.records.filter((record) => (
      record.phoneNumber === where.phoneNumber && record.consumedAt === null
    ));
    for (const record of targets) {
      Object.assign(record, data);
    }
    return { count: targets.length };
  }
}

class FakePrismaService {
  readonly otpChallenge = new FakeOtpChallengeDelegate();
}

class FakeWhatsappOtpSender {
  readonly sent: Array<{ code: string; phoneNumber: string }> = [];

  async sendAuthenticationCode(message: { code: string; phoneNumber: string }) {
    this.sent.push(message);
  }
}

function withDemoEnv() {
  process.env.OTP_PROVIDER = 'demo';
  process.env.DEMO_OTP_ALLOWLIST = '+243990000001';
  process.env.DEMO_OTP_CODE = '123456';
}

function createService() {
  const prisma = new FakePrismaService();
  const sender = new FakeWhatsappOtpSender();
  const ServiceConstructor = OtpService as unknown as new (
    prismaService: FakePrismaService,
    whatsappOtpSender: FakeWhatsappOtpSender,
  ) => OtpService;

  return {
    prisma,
    sender,
    service: new ServiceConstructor(prisma, sender),
  };
}

test('requestVerification stores a hashed demo challenge without sending whatsapp', async () => {
  withDemoEnv();
  const { prisma, sender, service } = createService();

  const verification = await service.requestVerification('+243990000001');

  assert.equal(verification.status, 'pending');
  assert.equal(prisma.otpChallenge.records.length, 1);
  assert.equal(prisma.otpChallenge.records[0].id, verification.sid);
  assert.equal(prisma.otpChallenge.records[0].phoneNumber, '+243990000001');
  assert.notEqual(prisma.otpChallenge.records[0].codeHash, '123456');
  assert.equal(verifyOtpCode('123456', prisma.otpChallenge.records[0].codeHash), true);
  assert.ok(prisma.otpChallenge.records[0].expiresAt.getTime() > Date.now());
  assert.deepEqual(sender.sent, []);
});

test('checkVerification approves the matching demo code and consumes the challenge', async () => {
  withDemoEnv();
  const { prisma, service } = createService();
  await service.requestVerification('+243990000001');

  const verification = await service.checkVerification({
    code: '123456',
    phoneNumber: '+243990000001',
  });

  assert.equal(verification.status, 'approved');
  assert.ok(prisma.otpChallenge.records[0].consumedAt);
});

test('checkVerification rejects a wrong code and increments attempts', async () => {
  withDemoEnv();
  const { prisma, service } = createService();
  await service.requestVerification('+243990000001');

  const verification = await service.checkVerification({
    code: '000000',
    phoneNumber: '+243990000001',
  });

  assert.notEqual(verification.status, 'approved');
  assert.equal(prisma.otpChallenge.records[0].attemptCount, 1);
  assert.equal(prisma.otpChallenge.records[0].consumedAt, null);
});

test('checkVerification rejects an expired challenge', async () => {
  withDemoEnv();
  const { prisma, service } = createService();
  await service.requestVerification('+243990000001');
  prisma.otpChallenge.records[0].expiresAt = new Date(Date.now() - 1_000);

  const verification = await service.checkVerification({
    code: '123456',
    phoneNumber: '+243990000001',
  });

  assert.notEqual(verification.status, 'approved');
});

test('checkVerification consumes the challenge after the attempt cap', async () => {
  withDemoEnv();
  const { prisma, service } = createService();
  await service.requestVerification('+243990000001');
  prisma.otpChallenge.records[0].attemptCount = 4;

  const verification = await service.checkVerification({
    code: '000000',
    phoneNumber: '+243990000001',
  });

  assert.notEqual(verification.status, 'approved');
  assert.equal(prisma.otpChallenge.records[0].attemptCount, 5);
  assert.ok(prisma.otpChallenge.records[0].consumedAt);
});
