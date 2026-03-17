import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';

type PersistedChatThread = {
  id: string;
  listing?: {
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

function toThreadPayload(thread: PersistedChatThread) {
  return {
    id: thread.id,
    listingTitle: thread.listing?.title ?? 'Annonce Zwibba',
    messages: (thread.messages ?? []).map((message) => ({
      body: message.body,
      id: message.id,
      senderRole: message.senderRole,
      sentAtLabel: message.sentAtLabel,
    })),
    participantName: 'Acheteur Zwibba',
  };
}

@Injectable()
export class ChatService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
  ) {}

  async fetchInbox(session: SessionRecord) {
    const threads = await this.prismaService.chatThread.findMany({
      where: {
        sellerPhoneNumber: session.phoneNumber,
      },
      include: {
        listing: true,
        messages: true,
      },
    });

    return {
      items: threads.map((thread) => ({
        id: thread.id,
        lastMessagePreview: thread.messages.at(-1)?.body ?? '',
        listingSlug: thread.listing?.slug ?? '',
        listingTitle: thread.listing?.title ?? 'Annonce Zwibba',
        participantName: 'Acheteur Zwibba',
        unreadCount: 0,
      })),
    };
  }

  async fetchThread({
    session,
    threadId,
  }: {
    session: SessionRecord;
    threadId: string;
  }) {
    const thread = await this.prismaService.chatThread.findUnique({
      where: {
        id: threadId,
      },
      include: {
        listing: true,
        messages: true,
      },
    });

    if (!thread || thread.sellerPhoneNumber !== session.phoneNumber) {
      throw new NotFoundException('Conversation introuvable.');
    }

    return toThreadPayload(thread as PersistedChatThread);
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

    if (!thread || thread.sellerPhoneNumber !== session.phoneNumber) {
      throw new NotFoundException('Conversation introuvable.');
    }

    await this.prismaService.chatMessage.create({
      data: {
        body: trimmedBody,
        senderRole: 'seller',
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

    return toThreadPayload(updatedThread as PersistedChatThread);
  }
}
