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
import 'package:zwibba_mobile/services/wallet_api_service.dart';

void main() {
  testWidgets('boost offer sheet is reachable from an approved seller listing',
      (tester) async {
    final walletApiService = _FakeWalletApiService();

    await tester.pumpWidget(ZwibbaApp(
      aiDraftApiService: _FakeAiDraftApiService(),
      authApiService: _FakeAuthApiService(),
      chatApiService: _FakeChatApiService(),
      draftApiService: _FakeDraftApiService(),
      localDraftCacheService:
          LocalDraftCacheService(backend: _MemoryDraftCacheBackend()),
      mediaApiService: _FakeMediaApiService(),
      walletApiService: walletApiService,
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
    await tester.tap(find.widgetWithText(FilledButton, 'Publier maintenant'));
    await tester.pumpAndSettle();

    await tester
        .tap(find.widgetWithText(OutlinedButton, 'Booster cette annonce'));
    await tester.pumpAndSettle();

    expect(find.text('Boost annonce'), findsOneWidget);
    expect(find.text('Booster pendant 24 h pour 15 000 CDF'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Activer le boost'));
    await tester.pumpAndSettle();

    expect(find.text('Boost activé pour 24 h'), findsOneWidget);
    expect(walletApiService.activateCalls, 1);
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
      title: 'Samsung Galaxy A54 128 Go',
    );
  }
}

class _FakeAuthApiService implements AuthApiService {
  @override
  Future<OtpChallenge> requestOtp({required String phoneNumber}) async {
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
    return const SellerSession(
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_243990000001',
    );
  }
}

class _FakeDraftApiService implements DraftApiService {
  @override
  Future<PublishOutcome> publishDraft({
    required ListingDraft draft,
    required SellerSession session,
  }) async {
    return const PublishOutcome(
      id: 'draft_approved',
      listingSlug: 'samsung-galaxy-a54-128-go',
      reasonSummary: 'Annonce approuvée et prête à partager.',
      shareUrl: 'https://zwibba.com/annonces/draft_approved',
      status: 'approved',
      statusLabel: 'Annonce approuvée et prête à partager',
    );
  }

  @override
  Future<ListingDraft> syncDraft({
    required ListingDraft draft,
    required SellerSession session,
  }) async {
    return draft.copyWith(
      ownerPhoneNumber: session.phoneNumber,
      syncedDraftId: 'draft_approved',
      syncStatus: 'synced',
    );
  }
}

class _FakeWalletApiService implements WalletApiService {
  int activateCalls = 0;

  @override
  Future<BoostResult> activateBoost({required String listingId}) async {
    activateCalls += 1;

    return const BoostResult(
      amountCdf: 15000,
      listingId: 'draft_approved',
      promoted: true,
      statusLabel: 'Boost activé pour 24 h',
    );
  }

  @override
  Future<WalletOverview> fetchWallet() async {
    return const WalletOverview(
      balanceCdf: 120000,
      transactions: [],
    );
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
  Future<List<ChatThreadSummary>> fetchInbox() async => const [];

  @override
  Future<ChatThread> fetchThread(String threadId) async {
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
