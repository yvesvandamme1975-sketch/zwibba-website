import '../models/listing_draft.dart';
import 'api_client.dart';
import 'auth_api_service.dart';

abstract class DraftApiService {
  Future<ListingDraft> syncDraft({
    required ListingDraft draft,
    required SellerSession session,
  });
}

class HttpDraftApiService implements DraftApiService {
  HttpDraftApiService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<ListingDraft> syncDraft({
    required ListingDraft draft,
    required SellerSession session,
  }) async {
    final json = await _apiClient.postJson(
      '/drafts/sync',
      headers: {
        'authorization': 'Bearer ${session.sessionToken}',
      },
      body: {
        'area': draft.area,
        'categoryId': draft.categoryId,
        'priceCdf': draft.priceCdfValue,
        'title': draft.title,
      },
    );

    return draft.copyWith(
      area: json['area'] as String,
      categoryId: json['categoryId'] as String,
      ownerPhoneNumber: json['ownerPhoneNumber'] as String,
      priceCdf: '${json['priceCdf']}',
      syncedDraftId: json['draftId'] as String,
      syncStatus: json['syncStatus'] as String,
      title: json['title'] as String,
    );
  }
}
