import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/services/chat_api_service.dart';
import 'package:zwibba_mobile/services/listings_api_service.dart';

void main() {
  testWidgets('profile screen remains reachable from the main app shell',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      chatApiService: _FakeChatApiService(),
      listingsApiService: _FakeListingsApiService(),
    ));

    await tester.tap(find.text('Profil'));
    await tester.pumpAndSettle();

    expect(find.text('Mon profil'), findsOneWidget);
    expect(find.text('+243 990 000 001'), findsOneWidget);
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
