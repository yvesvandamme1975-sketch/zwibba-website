import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/models/listing_draft.dart';
import 'package:zwibba_mobile/services/ai_draft_api_service.dart';
import 'package:zwibba_mobile/services/auth_api_service.dart';
import 'package:zwibba_mobile/services/draft_api_service.dart';
import 'package:zwibba_mobile/services/session_storage_service.dart';

void main() {
  testWidgets('otp gate appears only when publish is attempted',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      aiDraftApiService: _FakeAiDraftApiService(),
      authApiService: _FakeAuthApiService(),
      draftApiService: _FakeDraftApiService(),
    ));

    expect(find.text('Publiez seulement après vérification'), findsNothing);

    await tester.tap(find.widgetWithText(FilledButton, 'Prendre une photo'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Téléphone premium'));
    await tester.pumpAndSettle();
    await tester
        .tap(find.widgetWithText(FilledButton, 'Continuer vers le brouillon'));
    await tester.pumpAndSettle();

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
      draftApiService: draftApiService,
      sessionStorageService: SessionStorageService(
        backend: _MemorySessionStorageBackend(),
      ),
    ));

    await tester.tap(find.widgetWithText(FilledButton, 'Prendre une photo'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Téléphone premium'));
    await tester.pumpAndSettle();
    await tester
        .tap(find.widgetWithText(FilledButton, 'Continuer vers le brouillon'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, "Publier l'annonce"));
    await tester.pumpAndSettle();
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
      draftApiService: draftApiService,
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
    await tester
        .tap(find.widgetWithText(FilledButton, 'Continuer vers le brouillon'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, "Publier l'annonce"));
    await tester.pumpAndSettle();

    expect(find.text('Publiez seulement après vérification'), findsNothing);
    expect(draftApiService.syncCalls, 1);
    expect(find.text('Brouillon synchronisé'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Publier maintenant'),
        findsOneWidget);
  });
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
