import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/services/chat_api_service.dart';
import 'package:zwibba_mobile/services/listings_api_service.dart';

void main() {
  testWidgets('chat thread renders messages and appends a sent message',
      (tester) async {
    final chatApiService = _MutableFakeChatApiService();

    await tester.pumpWidget(ZwibbaApp(
      chatApiService: chatApiService,
      listingsApiService: _FakeListingsApiService(),
    ));

    await tester.tap(find.text('Messages'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Samsung Galaxy A54 neuf sous emballage'));
    await tester.pumpAndSettle();

    expect(find.text('Bonjour, toujours disponible ?'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'Je peux passer ce soir ?');
    await tester.tap(find.widgetWithText(FilledButton, 'Envoyer'));
    await tester.pumpAndSettle();

    expect(find.text('Je peux passer ce soir ?'), findsOneWidget);
    expect(chatApiService.sendCalls, 1);
  });
}

class _MutableFakeChatApiService implements ChatApiService {
  int sendCalls = 0;
  ChatThread thread = const ChatThread(
    id: 'thread_samsung_galaxy_a54',
    listingTitle: 'Samsung Galaxy A54 neuf sous emballage',
    participantName: 'Patrick Mobile',
    messages: [
      ChatMessage(
        body: 'Bonjour, toujours disponible ?',
        id: 'message_1',
        senderRole: 'buyer',
        sentAtLabel: '09:10',
      ),
      ChatMessage(
        body: 'Disponible aujourd’hui.',
        id: 'message_2',
        senderRole: 'seller',
        sentAtLabel: '09:11',
      ),
    ],
  );

  @override
  Future<ChatThread> fetchThread(String threadId) async {
    return thread;
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
    sendCalls += 1;
    thread = ChatThread(
      id: threadId,
      listingTitle: thread.listingTitle,
      participantName: thread.participantName,
      messages: [
        ...thread.messages,
        ChatMessage(
          body: body,
          id: 'message_3',
          senderRole: 'buyer',
          sentAtLabel: '09:14',
        ),
      ],
    );
    return thread;
  }
}

class _FakeListingsApiService implements ListingsApiService {
  @override
  Future<ListingDetail> fetchListingDetail(String slug) async {
    throw UnimplementedError();
  }

  @override
  Future<List<ListingSummary>> fetchBrowseListings() async {
    return const [];
  }
}
