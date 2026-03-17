import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/models/listing_draft.dart';
import 'package:zwibba_mobile/services/ai_draft_api_service.dart';
import 'package:zwibba_mobile/services/auth_api_service.dart';
import 'package:zwibba_mobile/services/chat_api_service.dart';
import 'package:zwibba_mobile/services/draft_api_service.dart';
import 'package:zwibba_mobile/services/local_draft_cache_service.dart';
import 'package:zwibba_mobile/services/media_api_service.dart';
import 'package:zwibba_mobile/services/session_storage_service.dart';

void main() {
  testWidgets('otp gate appears only when publish is attempted',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      aiDraftApiService: _FakeAiDraftApiService(),
      authApiService: _FakeAuthApiService(),
      chatApiService: _FakeChatApiService(),
      draftApiService: _FakeDraftApiService(),
      localDraftCacheService:
          LocalDraftCacheService(backend: _MemoryDraftCacheBackend()),
      mediaApiService: _FakeMediaApiService(),
    ));

    expect(find.text('Publiez seulement après vérification'), findsNothing);

    await tester.tap(find.widgetWithText(FilledButton, 'Prendre une photo'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Téléphone premium'));
    await tester.pumpAndSettle();
    await _tapPrimaryButton(tester, 'Continuer vers le brouillon');

    expect(find.text('Publiez seulement après vérification'), findsNothing);

    await tester.tap(find.widgetWithText(FilledButton, "Publier l'annonce"));
    await tester.pumpAndSettle();

    expect(find.text('Publiez seulement après vérification'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Continuer avec mon numéro'),
        findsOneWidget);
  });

  testWidgets('verified seller publish flow syncs the draft through the api',
      (tester) async {
    final authApiService = _FakeAuthApiService();
    final draftApiService = _FakeDraftApiService();

    await tester.pumpWidget(ZwibbaApp(
      aiDraftApiService: _FakeAiDraftApiService(),
      authApiService: authApiService,
      chatApiService: _FakeChatApiService(),
      draftApiService: draftApiService,
      localDraftCacheService:
          LocalDraftCacheService(backend: _MemoryDraftCacheBackend()),
      mediaApiService: _FakeMediaApiService(),
      sessionStorageService: SessionStorageService(
        backend: _MemorySessionStorageBackend(),
      ),
    ));

    await tester.tap(find.widgetWithText(FilledButton, 'Prendre une photo'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Téléphone premium'));
    await tester.pumpAndSettle();
    await _tapPrimaryButton(tester, 'Continuer vers le brouillon');
    await _tapPrimaryButton(tester, "Publier l'annonce");
    await tester
        .tap(find.widgetWithText(FilledButton, 'Continuer avec mon numéro'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Recevoir le code'));
    await tester.pumpAndSettle();
    await tester
        .tap(find.widgetWithText(FilledButton, 'Vérifier et continuer'));
    await tester.pumpAndSettle();

    expect(authApiService.requestOtpCalls, 1);
    expect(authApiService.verifyOtpCalls, 1);
    expect(draftApiService.syncCalls, 1);
    expect(find.text('Brouillon synchronisé'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Publier maintenant'),
        findsOneWidget);
  });

  testWidgets('restored seller session skips the otp gate on the next draft',
      (tester) async {
    final draftApiService = _FakeDraftApiService();

    await tester.pumpWidget(ZwibbaApp(
      aiDraftApiService: _FakeAiDraftApiService(),
      authApiService: _FakeAuthApiService(),
      chatApiService: _FakeChatApiService(),
      draftApiService: draftApiService,
      localDraftCacheService:
          LocalDraftCacheService(backend: _MemoryDraftCacheBackend()),
      mediaApiService: _FakeMediaApiService(),
      sessionStorageService: SessionStorageService(
        backend: _MemorySessionStorageBackend(
          initialValues: {
            'zwibba_session_can_sync_drafts': 'true',
            'zwibba_session_phone_number': '+243990000001',
            'zwibba_session_token': 'zwibba_session_243990000001',
          },
        ),
      ),
    ));

    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Prendre une photo'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Téléphone premium'));
    await tester.pumpAndSettle();
    await _tapPrimaryButton(tester, 'Continuer vers le brouillon');
    await _tapPrimaryButton(tester, "Publier l'annonce");

    expect(find.text('Publiez seulement après vérification'), findsNothing);
    expect(draftApiService.syncCalls, 1);
    expect(find.text('Brouillon synchronisé'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Publier maintenant'),
        findsOneWidget);
  });
}

Future<void> _tapPrimaryButton(WidgetTester tester, String label) async {
  final finder = find.widgetWithText(FilledButton, label);

  expect(finder, findsOneWidget);
  tester.widget<FilledButton>(finder).onPressed!.call();
  await tester.pump();
  await tester.pumpAndSettle();
}

class _FakeAiDraftApiService implements AiDraftApiService {
  @override
  Future<ListingDraft> prepareDraft({
    required ListingDraft draft,
    required String photoPresetId,
  }) async {
    return draft.copyWith(
      categoryId: 'phones_tablets',
      condition: 'like_new',
      description:
          'Téléphone propre, version 128 Go, batterie stable et prêt à l’emploi.',
      suggestedPriceMaxCdf: 4500000,
      suggestedPriceMinCdf: 3900000,
      title: 'Samsung Galaxy A54 128 Go',
    );
  }
}

class _FakeAuthApiService implements AuthApiService {
  int requestOtpCalls = 0;
  int verifyOtpCalls = 0;

  @override
  Future<OtpChallenge> requestOtp({required String phoneNumber}) async {
    requestOtpCalls += 1;

    return const OtpChallenge(
      challengeId: 'otp_243990000001',
      expiresInSeconds: 300,
      phoneNumber: '+243990000001',
    );
  }

  @override
  Future<SellerSession> verifyOtp({
    required String code,
    required String phoneNumber,
  }) async {
    verifyOtpCalls += 1;

    return const SellerSession(
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_243990000001',
    );
  }
}

class _FakeDraftApiService implements DraftApiService {
  int publishCalls = 0;
  int syncCalls = 0;

  @override
  Future<ListingDraft> syncDraft({
    required ListingDraft draft,
    required SellerSession session,
  }) async {
    syncCalls += 1;

    return draft.copyWith(
      ownerPhoneNumber: session.phoneNumber,
      syncedDraftId: 'draft_samsung-galaxy-a54-128-go',
      syncStatus: 'synced',
    );
  }

  @override
  Future<PublishOutcome> publishDraft({
    required ListingDraft draft,
    required SellerSession session,
  }) async {
    publishCalls += 1;

    return const PublishOutcome(
      id: 'draft_samsung-galaxy-a54-128-go',
      listingSlug: 'samsung-galaxy-a54-128-go',
      reasonSummary: 'Annonce approuvée et prête à partager.',
      shareUrl: 'https://zwibba.com/annonces/draft_samsung-galaxy-a54-128-go',
      status: 'approved',
      statusLabel: 'Annonce approuvée et prête à partager',
    );
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

class _FakeMediaApiService implements MediaApiService {
  @override
  Future<MediaUploadSlot> requestUploadSlot({
    required String contentType,
    required String fileName,
    required String sourcePresetId,
  }) async {
    return MediaUploadSlot(
      objectKey: 'draft-photos/$fileName',
      photoId: 'photo_$sourcePresetId',
      publicUrl: 'https://cdn.zwibba.example/draft-photos/$fileName',
      sourcePresetId: sourcePresetId,
      uploadUrl: Uri.parse('https://uploads.zwibba.example/$sourcePresetId'),
    );
  }

  @override
  Future<void> uploadBytes({
    required List<int> bytes,
    required String contentType,
    required Uri uploadUrl,
  }) async {}
}

class _MemoryDraftCacheBackend implements DraftCacheBackend {
  final Map<String, String> _store = <String, String>{};

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

class _FakeChatApiService implements ChatApiService {
  @override
  Future<List<ChatThreadSummary>> fetchInbox({
    required SellerSession session,
  }) async =>
      const [];

  @override
  Future<ChatThread> fetchThread(
    String threadId, {
    required SellerSession session,
  }) async {
    return const ChatThread(
      id: 'thread_1',
      listingTitle: 'Annonce',
      messages: [],
      participantName: 'Buyer',
    );
  }

  @override
  Future<ChatThread> sendMessage({
    required String body,
    required SellerSession session,
    required String threadId,
  }) async {
    return ChatThread(
      id: threadId,
      listingTitle: 'Annonce',
      messages: [
        ChatMessage(
          body: body,
          id: 'message_1',
          senderRole: 'seller',
          sentAtLabel: 'Maintenant',
        ),
      ],
      participantName: 'Buyer',
    );
  }
}
