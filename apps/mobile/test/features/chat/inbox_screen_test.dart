import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/services/chat_api_service.dart';
import 'package:zwibba_mobile/services/listings_api_service.dart';

void main() {
  testWidgets('messages tab renders the chat inbox from the api service',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      chatApiService: _FakeChatApiService(),
      listingsApiService: _FakeListingsApiService(),
    ));

    await tester.tap(find.text('Messages'));
    await tester.pumpAndSettle();

    expect(find.text('Inbox Zwibba'), findsOneWidget);
    expect(find.text('Samsung Galaxy A54 neuf sous emballage'), findsOneWidget);
    expect(find.text('Patrick Mobile'), findsOneWidget);
    expect(find.text('Disponible aujourd’hui.'), findsOneWidget);
  });
}

class _FakeChatApiService implements ChatApiService {
  @override
  Future<ChatThread> fetchThread(String threadId) async {
    return ChatThread(
      id: threadId,
      listingTitle: 'Samsung Galaxy A54 neuf sous emballage',
      messages: const [
        ChatMessage(
          body: 'Bonjour, toujours disponible ?',
          id: 'message_1',
          senderRole: 'buyer',
          sentAtLabel: '09:10',
        ),
      ],
      participantName: 'Patrick Mobile',
    );
  }

  @override
  Future<List<ChatThreadSummary>> fetchInbox() async {
    return const [
      ChatThreadSummary(
        id: 'thread_samsung_galaxy_a54',
        lastMessagePreview: 'Disponible aujourd’hui.',
        listingSlug: 'samsung-galaxy-a54-neuf-lubumbashi',
        listingTitle: 'Samsung Galaxy A54 neuf sous emballage',
        participantName: 'Patrick Mobile',
        unreadCount: 1,
      ),
    ];
  }

  @override
  Future<ChatThread> sendMessage({
    required String body,
    required String threadId,
  }) async {
    return ChatThread(
      id: threadId,
      listingTitle: 'Samsung Galaxy A54 neuf sous emballage',
      messages: [
        const ChatMessage(
          body: 'Bonjour, toujours disponible ?',
          id: 'message_1',
          senderRole: 'buyer',
          sentAtLabel: '09:10',
        ),
        ChatMessage(
          body: body,
          id: 'message_2',
          senderRole: 'buyer',
          sentAtLabel: '09:14',
        ),
      ],
      participantName: 'Patrick Mobile',
    );
  }
}

class _FakeListingsApiService implements ListingsApiService {
  @override
  Future<ListingDetail> fetchListingDetail(String slug) async {
    return ListingDetail(
      contactActions: const ['whatsapp', 'sms', 'call'],
      locationLabel: 'Lubumbashi, Bel Air',
      priceCdf: 450000,
      safetyTips: const ['Rencontrez le vendeur dans un lieu public.'],
      sellerName: 'Patrick Mobile',
      sellerResponseTime: 'Répond en moyenne en 9 min',
      sellerRole: 'Vendeur pro',
      slug: slug,
      summary: 'Smartphone Samsung garanti.',
      title: 'Samsung Galaxy A54 neuf sous emballage',
    );
  }

  @override
  Future<List<ListingSummary>> fetchBrowseListings() async {
    return const [];
  }
}
