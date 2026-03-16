import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/services/chat_api_service.dart';
import 'package:zwibba_mobile/services/listings_api_service.dart';
import 'package:zwibba_mobile/services/session_storage_service.dart';

void main() {
  testWidgets('profile screen remains reachable from the main app shell',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      chatApiService: _FakeChatApiService(),
      listingsApiService: _FakeListingsApiService(),
      sessionStorageService: SessionStorageService(
        backend: _MemorySessionStorageBackend(
          initialValues: {
            'zwibba_session_can_sync_drafts': 'true',
            'zwibba_session_phone_number': '+243990000111',
            'zwibba_session_token': 'zwibba_session_saved',
          },
        ),
      ),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Profil'));
    await tester.pumpAndSettle();

    expect(find.text('Mon profil'), findsOneWidget);
    expect(find.text('+243990000111'), findsOneWidget);
    expect(find.text('Session vérifiée'), findsOneWidget);
    expect(find.text('Mes annonces publiées'), findsOneWidget);
  });
}

class _FakeChatApiService implements ChatApiService {
  @override
  Future<ChatThread> fetchThread(String threadId) async {
    throw UnimplementedError();
  }

  @override
  Future<List<ChatThreadSummary>> fetchInbox() async {
    return const [];
  }

  @override
  Future<ChatThread> sendMessage({
    required String body,
    required String threadId,
  }) async {
    throw UnimplementedError();
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
