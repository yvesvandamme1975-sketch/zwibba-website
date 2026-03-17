import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/services/auth_api_service.dart';
import 'package:zwibba_mobile/services/chat_api_service.dart';
import 'package:zwibba_mobile/services/listings_api_service.dart';
import 'package:zwibba_mobile/services/session_storage_service.dart';

void main() {
  testWidgets('messages tab asks for verification when no session is active',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      chatApiService: _FakeChatApiService(),
      listingsApiService: _FakeListingsApiService(),
    ));

    await tester.tap(find.text('Messages'));
    await tester.pumpAndSettle();

    expect(
      find.text('Vérifiez votre numéro pour retrouver vos conversations.'),
      findsOneWidget,
    );
  });

  testWidgets('messages tab renders the chat inbox from the api service',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      chatApiService: _FakeChatApiService(),
      listingsApiService: _FakeListingsApiService(),
      sessionStorageService: SessionStorageService(
        backend: _MemorySessionStorageBackend(
          initialValues: {
            'zwibba_session_can_sync_drafts': 'true',
            'zwibba_session_phone_number': '+243990000001',
            'zwibba_session_token': 'zwibba_session_saved',
          },
        ),
      ),
    ));
    await tester.pumpAndSettle();

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
  Future<ChatThread> fetchThread(
    String threadId, {
    required SellerSession session,
  }) async {
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
  Future<List<ChatThreadSummary>> fetchInbox({
    required SellerSession session,
  }) async {
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
    required SellerSession session,
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
          senderRole: 'seller',
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
      id: 'listing_1',
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

class _MemorySessionStorageBackend implements SessionStorageBackend {
  _MemorySessionStorageBackend({
    this.initialValues = const {},
  }) : _store = Map<String, String>.from(initialValues);

  final Map<String, String> initialValues;
  final Map<String, String> _store;

  @override
  Future<void> delete(String key) async {
    _store.remove(key);
  }

  @override
  Future<String?> read(String key) async {
    return _store[key];
  }

  @override
  Future<void> write({
    required String key,
    required String value,
  }) async {
    _store[key] = value;
  }
}
