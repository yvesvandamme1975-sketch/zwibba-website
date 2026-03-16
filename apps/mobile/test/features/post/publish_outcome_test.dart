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

void main() {
  testWidgets('approved publish shows the success share screen',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      aiDraftApiService: _OutcomeAiDraftApiService(),
      authApiService: _OutcomeAuthApiService(),
      chatApiService: _FakeChatApiService(),
      draftApiService: _OutcomeDraftApiService(),
      localDraftCacheService:
          LocalDraftCacheService(backend: _MemoryDraftCacheBackend()),
      mediaApiService: _FakeMediaApiService(),
    ));

    await _syncApprovedDraft(tester);
    await tester.ensureVisible(
      find.widgetWithText(FilledButton, 'Publier maintenant'),
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Publier maintenant'));
    await tester.pumpAndSettle();

    expect(find.text('Annonce publiée'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Partager sur WhatsApp'),
        findsOneWidget);
  });

  testWidgets('vehicle publish shows the pending review screen',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      aiDraftApiService: _OutcomeAiDraftApiService(vehicleMode: true),
      authApiService: _OutcomeAuthApiService(),
      chatApiService: _FakeChatApiService(),
      draftApiService: _OutcomeDraftApiService(),
      localDraftCacheService:
          LocalDraftCacheService(backend: _MemoryDraftCacheBackend()),
      mediaApiService: _FakeMediaApiService(),
    ));

    await _syncVehicleDraft(tester);
    await tester.ensureVisible(
      find.widgetWithText(FilledButton, 'Publier maintenant'),
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Publier maintenant'));
    await tester.pumpAndSettle();

    expect(find.text('Annonce en revue'), findsOneWidget);
    expect(find.text('Annonce envoyée en revue manuelle'), findsOneWidget);
    expect(find.text('Votre annonce passe en revue manuelle.'), findsOneWidget);
  });

  testWidgets('blocked publish shows the fix guidance screen', (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      aiDraftApiService: _OutcomeAiDraftApiService(),
      authApiService: _OutcomeAuthApiService(),
      chatApiService: _FakeChatApiService(),
      draftApiService: _OutcomeDraftApiService(blockedMode: true),
      localDraftCacheService:
          LocalDraftCacheService(backend: _MemoryDraftCacheBackend()),
      mediaApiService: _FakeMediaApiService(),
    ));

    await _syncApprovedDraft(tester);
    await tester.ensureVisible(
      find.widgetWithText(FilledButton, 'Publier maintenant'),
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Publier maintenant'));
    await tester.pumpAndSettle();

    expect(find.text('Annonce bloquée'), findsOneWidget);
    expect(find.textContaining('description'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Corriger le brouillon'),
        findsOneWidget);
  });
}

Future<void> _syncApprovedDraft(WidgetTester tester) async {
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
  await tester.tap(find.widgetWithText(FilledButton, 'Vérifier et continuer'));
  await tester.pumpAndSettle();
}

Future<void> _syncVehicleDraft(WidgetTester tester) async {
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
  await tester.tap(find.widgetWithText(FilledButton, 'Vérifier et continuer'));
  await tester.pumpAndSettle();
}

Future<void> _tapPrimaryButton(WidgetTester tester, String label) async {
  final finder = find.widgetWithText(FilledButton, label);

  expect(finder, findsOneWidget);
  tester.widget<FilledButton>(finder).onPressed!.call();
  await tester.pump();
  await tester.pumpAndSettle();
}

class _OutcomeAiDraftApiService implements AiDraftApiService {
  _OutcomeAiDraftApiService({this.vehicleMode = false});

  final bool vehicleMode;

  @override
  Future<ListingDraft> prepareDraft({
    required ListingDraft draft,
    required String photoPresetId,
  }) async {
    if (vehicleMode) {
      return draft.copyWith(
        categoryId: 'vehicles',
        condition: 'used_good',
        description: 'SUV fiable avec papiers en ordre et entretien suivi.',
        title: 'Toyota Hilux 2019 4x4',
      );
    }

    return draft.copyWith(
      categoryId: 'phones_tablets',
      condition: 'like_new',
      description:
          'Téléphone propre, version 128 Go, batterie stable et prêt à l’emploi.',
      title: 'Samsung Galaxy A54 128 Go',
    );
  }
}

class _OutcomeAuthApiService implements AuthApiService {
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

class _OutcomeDraftApiService implements DraftApiService {
  _OutcomeDraftApiService({this.blockedMode = false});

  final bool blockedMode;

  @override
  Future<PublishOutcome> publishDraft({
    required ListingDraft draft,
    required SellerSession session,
  }) async {
    if (blockedMode) {
      return const PublishOutcome(
        id: 'draft_blocked',
        reasonSummary: 'La description doit être complétée avant publication.',
        shareUrl: '',
        status: 'blocked_needs_fix',
        statusLabel: 'Annonce bloquée: informations à corriger',
      );
    }

    if (draft.categoryId == 'vehicles') {
      return const PublishOutcome(
        id: 'draft_vehicle',
        reasonSummary: 'Votre annonce passe en revue manuelle.',
        shareUrl: '',
        status: 'pending_manual_review',
        statusLabel: 'Annonce envoyée en revue manuelle',
      );
    }

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
      syncedDraftId: 'draft_${draft.title.toLowerCase().replaceAll(' ', '-')}',
      syncStatus: 'synced',
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
