import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/models/listing_draft.dart';
import 'package:zwibba_mobile/services/api_client.dart';
import 'package:zwibba_mobile/services/auth_api_service.dart';
import 'package:zwibba_mobile/services/draft_api_service.dart';

void main() {
  test('draft api service syncs a verified seller draft', () async {
    final apiClient = _FakeApiClient(
      responses: {
        '/drafts/sync': {
          'area': 'Lubumbashi Centre',
          'categoryId': 'phones_tablets',
          'description': 'Téléphone propre, version 128 Go.',
          'draftId': 'draft_samsung-galaxy-a54-128-go',
          'ownerPhoneNumber': '+243990000001',
          'photos': [
            {
              'objectKey': 'draft-photos/phone-front.jpg',
              'photoId': 'photo_phone_front',
              'publicUrl':
                  'https://cdn.zwibba.example/draft-photos/phone-front.jpg',
              'sourcePresetId': 'phone-front',
              'uploadStatus': 'uploaded',
            },
          ],
          'priceCdf': 4256000,
          'syncStatus': 'synced',
          'title': 'Samsung Galaxy A54 128 Go',
        },
      },
    );
    final service = HttpDraftApiService(apiClient: apiClient);
    final draft = ListingDraft(
      area: 'Lubumbashi Centre',
      categoryId: 'phones_tablets',
      condition: 'like_new',
      description: 'Téléphone propre, version 128 Go.',
      guidancePrompts: const ['Face', 'Dos', 'Écran allumé'],
      photos: const [
        DraftPhoto(
          objectKey: 'draft-photos/phone-front.jpg',
          photoId: 'photo_phone_front',
          publicUrl: 'https://cdn.zwibba.example/draft-photos/phone-front.jpg',
          sourcePresetId: 'phone-front',
          uploadStatus: 'uploaded',
        ),
      ],
      priceCdf: '4256000',
      title: 'Samsung Galaxy A54 128 Go',
    );
    const session = SellerSession(
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_243990000001',
    );

    final syncedDraft = await service.syncDraft(
      draft: draft,
      session: session,
    );

    expect(syncedDraft.syncedDraftId, 'draft_samsung-galaxy-a54-128-go');
    expect(syncedDraft.syncStatus, 'synced');
    expect(syncedDraft.ownerPhoneNumber, '+243990000001');
    expect(apiClient.requests.single.path, '/drafts/sync');
    expect(
      apiClient.requests.single.headers['authorization'],
      'Bearer zwibba_session_243990000001',
    );
    expect(apiClient.requests.single.body['priceCdf'], 4256000);
    expect((apiClient.requests.single.body['photos'] as List).length, 1);
  });
}

class _FakeApiClient implements ApiClient {
  _FakeApiClient({
    required this.responses,
  });

  final List<_RecordedRequest> requests = [];
  final Map<String, Map<String, dynamic>> responses;

  @override
  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? headers,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, String>? headers,
    required Map<String, dynamic> body,
  }) async {
    requests.add(_RecordedRequest(
      body: body,
      headers: headers ?? const {},
      path: path,
    ));
    return responses[path]!;
  }
}

class _RecordedRequest {
  const _RecordedRequest({
    required this.body,
    required this.headers,
    required this.path,
  });

  final Map<String, dynamic> body;
  final Map<String, String> headers;
  final String path;
}
