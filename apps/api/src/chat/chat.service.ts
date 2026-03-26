import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';

type PersistedChatThread = {
  buyerUserId: string;
  id: string;
  listing?: {
    ownerPhoneNumber?: string;
    slug: string;
    title: string;
  } | null;
  messages?: Array<{
    body: string;
    id: string;
    senderRole: string;
    sentAtLabel: string;
  }>;
  sellerPhoneNumber: string;
};

function buildParticipantName({
  thread,
  viewerRole,
}: {
  thread: PersistedChatThread;
  viewerRole: 'buyer' | 'seller';
}) {
  if (viewerRole === 'seller') {
    return 'Acheteur Zwibba';
  }

  const lastDigits = thread.sellerPhoneNumber.slice(-4);
  return `Vendeur ${lastDigits}`;
}

function toThreadPayload(
  thread: PersistedChatThread,
  viewerRole: 'buyer' | 'seller',
) {
  return {
    id: thread.id,
    listingTitle: thread.listing?.title ?? 'Annonce Zwibba',
    messages: (thread.messages ?? []).map((message) => ({
      body: message.body,
      id: message.id,
      senderRole: message.senderRole,
      sentAtLabel: message.sentAtLabel,
    })),
    participantName: buildParticipantName({
      thread,
      viewerRole,
    }),
  };
}

@Injectable()
export class ChatService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
  ) {}

  private async resolveViewerContext(session: SessionRecord) {
    const user = await this.prismaService.user.findUnique({
      where: {
        phoneNumber: session.phoneNumber,
      },
    });

    return {
      user,
    };
  }

  private resolveViewerRole({
    session,
    thread,
    userId = '',
  }: {
    session: SessionRecord;
    thread: PersistedChatThread;
    userId?: string;
  }): 'buyer' | 'seller' {
    if (thread.sellerPhoneNumber === session.phoneNumber) {
      return 'seller';
    }

    if (userId && thread.buyerUserId === userId) {
      return 'buyer';
    }

    throw new NotFoundException('Conversation introuvable.');
  }

  async fetchInbox(session: SessionRecord) {
    const { user } = await this.resolveViewerContext(session);
    const [sellerThreads, buyerThreads] = await Promise.all([
      this.prismaService.chatThread.findMany({
        where: {
          sellerPhoneNumber: session.phoneNumber,
        },
        include: {
          listing: true,
          messages: true,
        },
      }),
      user
        ? this.prismaService.chatThread.findMany({
            where: {
              buyerUserId: user.id,
            },
            include: {
              listing: true,
              messages: true,
            },
          })
        : Promise.resolve([]),
    ]);
    const seenThreadIds = new Set<string>();
    const threads = [...sellerThreads, ...buyerThreads].filter((thread) => {
      if (seenThreadIds.has(thread.id)) {
        return false;
      }

      seenThreadIds.add(thread.id);
      return true;
    });

    return {
      items: threads.map((thread) => ({
        id: thread.id,
        lastMessagePreview: thread.messages.at(-1)?.body ?? '',
        listingSlug: thread.listing?.slug ?? '',
        listingTitle: thread.listing?.title ?? 'Annonce Zwibba',
        participantName: buildParticipantName({
          thread: thread as PersistedChatThread,
          viewerRole: thread.sellerPhoneNumber === session.phoneNumber ? 'seller' : 'buyer',
        }),
        unreadCount: 0,
      })),
    };
  }

  async createThread({
    listingId,
    session,
  }: {
    listingId: string;
    session: SessionRecord;
  }) {
    const normalizedListingId = listingId.trim();

    if (!normalizedListingId) {
      throw new BadRequestException('Annonce introuvable.');
    }

    const { user } = await this.resolveViewerContext(session);

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const listing = await this.prismaService.listing.findUnique({
      where: {
        id: normalizedListingId,
      },
    });

    if (!listing) {
      throw new NotFoundException('Annonce introuvable.');
    }

    const existingThread = await this.prismaService.chatThread.findFirst({
      where: {
        buyerUserId: user.id,
        listingId: normalizedListingId,
      },
    });

    const thread = existingThread ??
      await this.prismaService.chatThread.create({
        data: {
          buyerUserId: user.id,
          listingId: normalizedListingId,
          sellerPhoneNumber: listing.ownerPhoneNumber,
        },
      });

    const persistedThread = await this.prismaService.chatThread.findUnique({
      where: {
        id: thread.id,
      },
      include: {
        listing: true,
        messages: true,
      },
    });

    if (!persistedThread) {
      throw new NotFoundException('Conversation introuvable.');
    }

    return toThreadPayload(persistedThread as PersistedChatThread, 'buyer');
  }

  async fetchThread({
    session,
    threadId,
  }: {
    session: SessionRecord;
    threadId: string;
  }) {
    const { user } = await this.resolveViewerContext(session);
    const thread = await this.prismaService.chatThread.findUnique({
      where: {
        id: threadId,
      },
      include: {
        listing: true,
        messages: true,
      },
    });

    if (!thread) {
      throw new NotFoundException('Conversation introuvable.');
    }

    const viewerRole = this.resolveViewerRole({
      session,
      thread: thread as PersistedChatThread,
      userId: user?.id,
    });

    return toThreadPayload(thread as PersistedChatThread, viewerRole);
  }

  async sendMessage({
    body,
    session,
    threadId,
  }: {
    body: string;
    session: SessionRecord;
    threadId: string;
  }) {
    const { user } = await this.resolveViewerContext(session);
    const trimmedBody = body.trim();

    if (trimmedBody.length === 0) {
      throw new BadRequestException('Le message ne peut pas être vide.');
    }

    const thread = await this.prismaService.chatThread.findUnique({
      where: {
        id: threadId,
      },
      include: {
        listing: true,
        messages: true,
      },
    });

    if (!thread) {
      throw new NotFoundException('Conversation introuvable.');
    }

    const viewerRole = this.resolveViewerRole({
      session,
      thread: thread as PersistedChatThread,
      userId: user?.id,
    });

    await this.prismaService.chatMessage.create({
      data: {
        body: trimmedBody,
        senderRole: viewerRole,
        sentAtLabel: 'Maintenant',
        threadId,
      },
    });

    const updatedThread = await this.prismaService.chatThread.findUnique({
      where: {
        id: threadId,
      },
      include: {
        listing: true,
        messages: true,
      },
    });

    if (!updatedThread) {
      throw new NotFoundException('Conversation introuvable.');
    }

    return toThreadPayload(updatedThread as PersistedChatThread, viewerRole);
  }
}
