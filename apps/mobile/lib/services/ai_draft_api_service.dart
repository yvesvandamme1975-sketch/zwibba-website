import '../models/listing_draft.dart';
import 'api_client.dart';

abstract class AiDraftApiService {
  Future<ListingDraft> prepareDraft({
    required ListingDraft draft,
    required String photoPresetId,
  });
}

class HttpAiDraftApiService implements AiDraftApiService {
  HttpAiDraftApiService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<ListingDraft> prepareDraft({
    required ListingDraft draft,
    required String photoPresetId,
  }) async {
    final json = await _apiClient.postJson(
      '/ai/draft',
      body: {
        'photoPresetId': photoPresetId,
      },
    );
    final patch = Map<String, dynamic>.from(json['draftPatch'] as Map);

    return draft.copyWith(
      categoryId: patch['categoryId'] as String,
      condition: patch['condition'] as String,
      description: patch['description'] as String,
      title: patch['title'] as String,
    );
  }
}
