import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/models/listing_draft.dart';
import 'package:zwibba_mobile/services/ai_draft_api_service.dart';
import 'package:zwibba_mobile/services/auth_api_service.dart';
import 'package:zwibba_mobile/services/draft_api_service.dart';
import 'package:zwibba_mobile/services/wallet_api_service.dart';

void main() {
  testWidgets('boost offer sheet is reachable from an approved seller listing',
      (tester) async {
    final walletApiService = _FakeWalletApiService();

    await tester.pumpWidget(ZwibbaApp(
      aiDraftApiService: _FakeAiDraftApiService(),
      authApiService: _FakeAuthApiService(),
      draftApiService: _FakeDraftApiService(),
      walletApiService: walletApiService,
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
