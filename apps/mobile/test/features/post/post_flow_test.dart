import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/models/listing_draft.dart';
import 'package:zwibba_mobile/services/ai_draft_api_service.dart';
import 'package:zwibba_mobile/services/auth_api_service.dart';
import 'package:zwibba_mobile/services/draft_api_service.dart';

void main() {
  testWidgets('first photo starts a draft and unlocks the resume CTA',
      (tester) async {
    final aiDraftApiService = _FakeAiDraftApiService();

    await tester.pumpWidget(ZwibbaApp(
      aiDraftApiService: aiDraftApiService,
      authApiService: _FakeAuthApiService(),
      draftApiService: _FakeDraftApiService(),
    ));

    await tester.tap(find.widgetWithText(FilledButton, 'Prendre une photo'));
    await tester.pumpAndSettle();

    expect(find.text('Choisissez une photo de départ'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Téléphone premium'));
    await tester.pumpAndSettle();

    expect(find.text('Photos guidées'), findsOneWidget);
    expect(aiDraftApiService.prepareDraftCalls, 1);

    await tester.tap(find.text("Retour à l'accueil"));
    await tester.pumpAndSettle();

    expect(find.widgetWithText(FilledButton, 'Continuer mon brouillon'),
        findsOneWidget);
    expect(find.text('Samsung Galaxy A54 128 Go'), findsOneWidget);
  });
}

class _FakeAiDraftApiService implements AiDraftApiService {
  int prepareDraftCalls = 0;

  @override
  Future<ListingDraft> prepareDraft({
    required ListingDraft draft,
    required String photoPresetId,
  }) async {
    prepareDraftCalls += 1;

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
      id: 'draft_samsung-galaxy-a54-128-go',
      reasonSummary: 'Annonce approuvée et prête à partager.',
      shareUrl: 'https://zwibba.com/annonces/draft_samsung-galaxy-a54-128-go',
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
      syncedDraftId: 'draft_samsung-galaxy-a54-128-go',
      syncStatus: 'synced',
    );
  }
}
