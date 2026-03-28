import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { TwilioVerifyService } from '../../src/auth/twilio-verify.service';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

class _FakeTwilioVerifyService {
  async checkVerification({
    code,
  }: {
    code: string;
    phoneNumber: string;
  }) {
    return {
      sid: 'VE243990000001',
      status: code == '123456' ? 'approved' : 'pending',
    };
  }

  async requestVerification(phoneNumber: string) {
    return {
      sid: `VE${phoneNumber.replaceAll('+', '')}`,
      status: 'pending',
    };
  }
}

class _FakePrismaService {
  #messageSequence = 0;
  readonly chatMessagesByThreadId = new Map<string, Array<Record<string, unknown>>>();
  readonly chatThreads = new Map<string, Record<string, unknown>>();
  readonly listings = new Map<string, Record<string, unknown>>();
  readonly sessions = new Map<string, {
    token: string;
    user: {
      id: string;
      phoneNumber: string;
    };
    userId: string;
  }>();
  readonly users = new Map<string, {
    id: string;
    phoneNumber: string;
  }>();

  seedChatThread(thread: {
    buyerPhoneNumber: string;
    id: string;
    listingId: string;
    sellerPhoneNumber: string;
  }) {
    this.chatThreads.set(thread.id, {
      ...thread,
      buyerLastReadAt: null,
      buyerUserId: `user_${thread.buyerPhoneNumber.replaceAll('+', '')}`,
      sellerLastReadAt: null,
    });
  }

  seedListing(listing: {
    id: string;
    ownerPhoneNumber: string;
    slug: string;
    title: string;
  }) {
    this.listings.set(listing.id, listing);
  }

  seedMessage(threadId: string, message: {
    body: string;
    id: string;
    senderRole: string;
    sentAtLabel: string;
  }) {
    const current = this.chatMessagesByThreadId.get(threadId) ?? [];
    this.#messageSequence += 1;
    current.push({
      ...message,
      createdAt: new Date(this.#messageSequence * 60_000),
    });
    this.chatMessagesByThreadId.set(threadId, current);
  }

  readonly session = {
    create: async ({
      data,
    }: {
      data: {
        token: string;
        userId: string;
      };
    }) => {
      const user = this.users.get(data.userId) ?? {
        id: data.userId,
        phoneNumber: '+243990000001',
      };
      const session = {
        token: data.token,
        user,
        userId: user.id,
      };
      this.sessions.set(session.token, session);
      return session;
    },
    findUnique: async ({
      where,
    }: {
      where: {
        token: string;
      };
    }) => {
      return this.sessions.get(where.token) ?? null;
    },
  };

  readonly user = {
    findUnique: async ({
      where,
    }: {
      where: {
        id?: string;
        phoneNumber?: string;
      };
    }) => {
      if (where.id) {
        return this.users.get(where.id) ?? null;
      }

      return Array.from(this.users.values()).find((user) => {
        return user.phoneNumber === where.phoneNumber;
      }) ?? null;
    },
    upsert: async ({
      where,
    }: {
      where: {
        phoneNumber: string;
      };
    }) => {
      const existingUser = Array.from(this.users.values()).find((user) => {
        return user.phoneNumber === where.phoneNumber;
      });

      if (existingUser) {
        return existingUser;
      }

      const user = {
        id: `user_${where.phoneNumber.replaceAll('+', '')}`,
        phoneNumber: where.phoneNumber,
      };
      this.users.set(user.id, user);
      return user;
    },
  };

  readonly verificationAttempt = {
    create: async () => ({ id: 'attempt_1' }),
    updateMany: async () => ({ count: 1 }),
  };

  readonly listing = {
    findUnique: async ({
      where,
    }: {
      where: {
        id: string;
      };
    }) => {
      return this.listings.get(where.id) ?? null;
    },
  };

  readonly chatThread = {
    create: async ({
      data,
    }: {
      data: {
        buyerLastReadAt?: Date;
        buyerUserId: string;
        listingId: string;
        sellerPhoneNumber: string;
      };
    }) => {
      const thread = {
        ...data,
        id: `thread_${this.chatThreads.size + 1}`,
        sellerLastReadAt: null,
      };
      this.chatThreads.set(thread.id, thread);
      return thread;
    },
    findFirst: async ({
      where,
    }: {
      where: {
        buyerUserId?: string;
        listingId?: string;
        sellerPhoneNumber?: string;
      };
    }) => {
      return Array.from(this.chatThreads.values()).find((thread) => {
        if (where.buyerUserId && thread.buyerUserId !== where.buyerUserId) {
          return false;
        }

        if (where.listingId && thread.listingId !== where.listingId) {
          return false;
        }

        if (
          where.sellerPhoneNumber &&
          thread.sellerPhoneNumber !== where.sellerPhoneNumber
        ) {
          return false;
        }

        return true;
      }) ?? null;
    },
    findMany: async ({
      include,
      where,
    }: {
      include?: {
        listing?: boolean;
        messages?: boolean;
      };
      where?: {
        buyerUserId?: string;
        sellerPhoneNumber?: string;
      };
    } = {}) => {
      return Array.from(this.chatThreads.values())
        .filter((thread) => {
          if (where?.buyerUserId && thread.buyerUserId !== where.buyerUserId) {
            return false;
          }

          if (!where?.sellerPhoneNumber) {
            return true;
          }

          return thread.sellerPhoneNumber === where.sellerPhoneNumber;
        })
        .map((thread) => ({
          ...thread,
          listing: include?.listing
            ? this.listings.get(thread.listingId as string) ?? null
            : undefined,
          messages: include?.messages
            ? this.chatMessagesByThreadId.get(thread.id as string) ?? []
            : undefined,
        }));
    },
    findUnique: async ({
      include,
      where,
    }: {
      include?: {
        listing?: boolean;
        messages?: boolean;
      };
      where: {
        id: string;
      };
    }) => {
      const thread = this.chatThreads.get(where.id);

      if (!thread) {
        return null;
      }

      return {
        ...thread,
        listing: include?.listing
          ? this.listings.get(thread.listingId as string) ?? null
          : undefined,
        messages: include?.messages
          ? this.chatMessagesByThreadId.get(thread.id as string) ?? []
          : undefined,
      };
    },
    update: async ({
      data,
      where,
    }: {
      data: {
        buyerLastReadAt?: Date;
        sellerLastReadAt?: Date;
      };
      where: {
        id: string;
      };
    }) => {
      const thread = this.chatThreads.get(where.id);

      if (!thread) {
        return null;
      }

      const updatedThread = {
        ...thread,
        ...data,
      };
      this.chatThreads.set(where.id, updatedThread);
      return updatedThread;
    },
  };

  readonly chatMessage = {
    create: async ({
      data,
    }: {
      data: {
        body: string;
        senderRole: string;
        sentAtLabel: string;
        threadId: string;
      };
    }) => {
      const currentMessages = this.chatMessagesByThreadId.get(data.threadId) ?? [];
      const nextMessage = {
        ...data,
        createdAt: new Date((currentMessages.length + 1) * 60_000 + 1_000_000),
        id: `message_${currentMessages.length + 1}`,
      };
      currentMessages.push(nextMessage);
      this.chatMessagesByThreadId.set(data.threadId, currentMessages);
      return nextMessage;
    },
  };
}

async function createTestApp(prisma: _FakePrismaService): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(TwilioVerifyService)
    .useValue(new _FakeTwilioVerifyService())
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

async function createSellerSession(
  app: INestApplication,
  phoneNumber: string,
): Promise<string> {
  await request(app.getHttpServer())
    .post('/auth/request-otp')
    .send({ phoneNumber })
    .expect(201);

  const verifyResponse = await request(app.getHttpServer())
    .post('/auth/verify-otp')
    .send({
      phoneNumber,
      code: '123456',
    })
    .expect(201);

  return verifyResponse.body.sessionToken as string;
}

test('chat inbox requires a real session and only returns persisted seller threads', async (t) => {
  const prisma = new _FakePrismaService();
  prisma.seedListing({
    id: 'listing_1',
    ownerPhoneNumber: '+243990000001',
    slug: 'samsung-galaxy-a54-128-go',
    title: 'Samsung Galaxy A54 128 Go',
  });
  prisma.seedListing({
    id: 'listing_2',
    ownerPhoneNumber: '+243990000002',
    slug: 'toyota-hilux-2019-4x4',
    title: 'Toyota Hilux 2019 4x4',
  });
  prisma.seedChatThread({
    buyerPhoneNumber: '+243990000111',
    id: 'thread_listing_1',
    listingId: 'listing_1',
    sellerPhoneNumber: '+243990000001',
  });
  prisma.seedMessage('thread_listing_1', {
    body: 'Disponible aujourd’hui.',
    id: 'message_1',
    senderRole: 'buyer',
    sentAtLabel: '09:10',
  });
  prisma.seedChatThread({
    buyerPhoneNumber: '+243990000222',
    id: 'thread_listing_2',
    listingId: 'listing_2',
    sellerPhoneNumber: '+243990000002',
  });
  prisma.seedMessage('thread_listing_2', {
    body: 'Toujours en vente ?',
    id: 'message_2',
    senderRole: 'buyer',
    sentAtLabel: '10:05',
  });

  const app = await createTestApp(prisma);
  t.after(async () => {
    await app.close();
  });

  await request(app.getHttpServer())
    .get('/chat/threads')
    .expect(401);

  const sessionToken = await createSellerSession(app, '+243990000001');
  const response = await request(app.getHttpServer())
    .get('/chat/threads')
    .set('authorization', `Bearer ${sessionToken}`)
    .expect(200);

  assert.equal(response.body.items.length, 1);
  assert.equal(response.body.items[0].id, 'thread_listing_1');
  assert.equal(response.body.items[0].listingSlug, 'samsung-galaxy-a54-128-go');
  assert.equal(response.body.items[0].listingTitle, 'Samsung Galaxy A54 128 Go');
  assert.equal(response.body.items[0].unreadCount, 1);

  await request(app.getHttpServer())
    .get('/chat/threads/thread_listing_1')
    .set('authorization', `Bearer ${sessionToken}`)
    .expect(200);

  const readResponse = await request(app.getHttpServer())
    .get('/chat/threads')
    .set('authorization', `Bearer ${sessionToken}`)
    .expect(200);

  assert.equal(readResponse.body.items[0].unreadCount, 0);
});

test('chat send persists a seller reply on the authenticated thread', async (t) => {
  const prisma = new _FakePrismaService();
  prisma.seedListing({
    id: 'listing_1',
    ownerPhoneNumber: '+243990000001',
    slug: 'samsung-galaxy-a54-128-go',
    title: 'Samsung Galaxy A54 128 Go',
  });
  prisma.seedChatThread({
    buyerPhoneNumber: '+243990000111',
    id: 'thread_listing_1',
    listingId: 'listing_1',
    sellerPhoneNumber: '+243990000001',
  });
  prisma.seedMessage('thread_listing_1', {
    body: 'Bonjour, toujours disponible ?',
    id: 'message_1',
    senderRole: 'buyer',
    sentAtLabel: '09:10',
  });

  const app = await createTestApp(prisma);
  t.after(async () => {
    await app.close();
  });

  const sessionToken = await createSellerSession(app, '+243990000001');
  const sendResponse = await request(app.getHttpServer())
    .post('/chat/threads/thread_listing_1/messages')
    .set('authorization', `Bearer ${sessionToken}`)
    .send({
      body: 'Oui, toujours disponible.',
    })
    .expect(201);

  assert.equal(sendResponse.body.messages.length, 2);
  assert.equal(sendResponse.body.messages.at(-1).body, 'Oui, toujours disponible.');
  assert.equal(sendResponse.body.messages.at(-1).senderRole, 'seller');
  assert.equal(
    prisma.chatMessagesByThreadId.get('thread_listing_1')?.length,
    2,
  );

  const buyerSessionToken = await createSellerSession(app, '+243990000111');
  const buyerInboxResponse = await request(app.getHttpServer())
    .get('/chat/threads')
    .set('authorization', `Bearer ${buyerSessionToken}`)
    .expect(200);

  assert.equal(buyerInboxResponse.body.items[0].unreadCount, 1);
});

test('chat thread creation reuses the buyer thread for a listing and exposes it in inbox', async (t) => {
  const prisma = new _FakePrismaService();
  prisma.seedListing({
    id: 'listing_1',
    ownerPhoneNumber: '+243990000001',
    slug: 'samsung-galaxy-a54-128-go',
    title: 'Samsung Galaxy A54 128 Go',
  });

  const app = await createTestApp(prisma);
  t.after(async () => {
    await app.close();
  });

  const buyerSessionToken = await createSellerSession(app, '+243990000111');
  const firstResponse = await request(app.getHttpServer())
    .post('/chat/threads')
    .set('authorization', `Bearer ${buyerSessionToken}`)
    .send({
      listingId: 'listing_1',
    })
    .expect(201);

  const secondResponse = await request(app.getHttpServer())
    .post('/chat/threads')
    .set('authorization', `Bearer ${buyerSessionToken}`)
    .send({
      listingId: 'listing_1',
    })
    .expect(201);

  assert.equal(firstResponse.body.id, secondResponse.body.id);
  assert.equal(prisma.chatThreads.size, 1);

  const inboxResponse = await request(app.getHttpServer())
    .get('/chat/threads')
    .set('authorization', `Bearer ${buyerSessionToken}`)
    .expect(200);

  assert.equal(inboxResponse.body.items.length, 1);
  assert.equal(inboxResponse.body.items[0].listingSlug, 'samsung-galaxy-a54-128-go');
});
