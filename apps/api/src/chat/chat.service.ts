import { Injectable, NotFoundException } from '@nestjs/common';

type ChatMessageRecord = {
  body: string;
  id: string;
  senderRole: 'buyer' | 'seller';
  sentAtLabel: string;
};

type ChatThreadRecord = {
  id: string;
  listingSlug: string;
  listingTitle: string;
  messages: ChatMessageRecord[];
  participantName: string;
  sellerPhoneNumber: string;
};

const seededThreads: ChatThreadRecord[] = [
  {
    id: 'thread_samsung_galaxy_a54',
    listingSlug: 'samsung-galaxy-a54-neuf-lubumbashi',
    listingTitle: 'Samsung Galaxy A54 neuf sous emballage',
    participantName: 'Patrick Mobile',
    sellerPhoneNumber: '+243990000001',
    messages: [
      {
        id: 'message_1',
        body: 'Bonjour, toujours disponible ?',
        senderRole: 'buyer',
        sentAtLabel: '09:10',
      },
      {
        id: 'message_2',
        body: 'Disponible aujourd’hui.',
        senderRole: 'seller',
        sentAtLabel: '09:11',
      },
    ],
  },
];

@Injectable()
export class ChatService {
  private readonly threads = new Map(
    seededThreads.map((thread) => [thread.id, structuredClone(thread)]),
  );

  fetchInbox() {
    return {
      items: Array.from(this.threads.values()).map((thread) => ({
        id: thread.id,
        lastMessagePreview: thread.messages.at(-1)?.body ?? '',
        listingSlug: thread.listingSlug,
        listingTitle: thread.listingTitle,
        participantName: thread.participantName,
        unreadCount: 1,
      })),
    };
  }

  fetchThread(threadId: string) {
    const thread = this.threads.get(threadId);

    if (!thread) {
      throw new NotFoundException('Conversation introuvable.');
    }

    return {
      id: thread.id,
      listingTitle: thread.listingTitle,
      messages: thread.messages,
      participantName: thread.participantName,
    };
  }

  sendMessage({
    body,
    threadId,
  }: {
    body: string;
    threadId: string;
  }) {
    const thread = this.threads.get(threadId);

    if (!thread) {
      throw new NotFoundException('Conversation introuvable.');
    }

    thread.messages.push({
      body,
      id: `message_${thread.messages.length + 1}`,
      senderRole: 'buyer',
      sentAtLabel: '09:14',
    });

    return {
      id: thread.id,
      listingTitle: thread.listingTitle,
      messages: thread.messages,
      participantName: thread.participantName,
    };
  }
}
