import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/models/listing_draft.dart';
import 'package:zwibba_mobile/services/ai_draft_api_service.dart';
import 'package:zwibba_mobile/services/api_client.dart';

void main() {
  test('ai draft api service maps the api patch into the flutter draft model',
      () async {
    final apiClient = _FakeApiClient(
      responses: {
        '/ai/draft': {
          'status': 'ready',
          'draftPatch': {
            'categoryId': 'phones_tablets',
            'condition': 'like_new',
            'description':
                'Téléphone propre, version 128 Go, batterie stable et prêt à l’emploi.',
            'suggestedPriceMaxCdf': 4500000,
            'suggestedPriceMinCdf': 3900000,
            'title': 'Samsung Galaxy A54 128 Go',
          },
        },
      },
    );
    final service = HttpAiDraftApiService(apiClient: apiClient);
    final draft = ListingDraft(
      area: 'Lubumbashi Centre',
      description: 'Brouillon local',
      guidancePrompts: const ['Face', 'Dos', 'Écran allumé'],
      photos: const [],
      priceCdf: '4256000',
      title: 'Annonce locale',
    );

    final nextDraft = await service.prepareDraft(
      draft: draft,
      photoPresetId: 'phone-front',
    );

    expect(nextDraft.title, 'Samsung Galaxy A54 128 Go');
    expect(nextDraft.categoryId, 'phones_tablets');
    expect(nextDraft.condition, 'like_new');
    expect(nextDraft.description, contains('Téléphone propre'));
    expect(nextDraft.toJson().containsKey('suggestedPriceMinCdf'), isFalse);
    expect(nextDraft.toJson().containsKey('suggestedPriceMaxCdf'), isFalse);
    expect(apiClient.requests.single.path, '/ai/draft');
    expect(apiClient.requests.single.body['photoPresetId'], 'phone-front');
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
