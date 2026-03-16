import '../models/listing_draft.dart';
import 'api_client.dart';
import 'auth_api_service.dart';

class PublishOutcome {
  const PublishOutcome({
    required this.id,
    required this.reasonSummary,
    required this.shareUrl,
    required this.status,
    required this.statusLabel,
  });

  final String id;
  final String reasonSummary;
  final String shareUrl;
  final String status;
  final String statusLabel;
}

abstract class DraftApiService {
  Future<ListingDraft> syncDraft({
    required ListingDraft draft,
    required SellerSession session,
  });

  Future<PublishOutcome> publishDraft({
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
        'description': draft.description,
        'draftId': draft.syncedDraftId,
        'photos': draft.photos
            .map((photo) => {
                  'objectKey': photo.objectKey,
                  'photoId': photo.photoId,
                  'publicUrl': photo.publicUrl,
                  'sourcePresetId': photo.sourcePresetId,
                  'uploadStatus': photo.uploadStatus,
                })
            .toList(),
        'priceCdf': draft.priceCdfValue,
        'title': draft.title,
      },
    );
    final responsePhotos =
        (json['photos'] as List<dynamic>? ?? const <dynamic>[])
            .map((photo) => DraftPhoto.fromJson(
                Map<String, dynamic>.from(photo as Map<dynamic, dynamic>)))
            .toList();

    return draft.copyWith(
      area: json['area'] as String,
      categoryId: json['categoryId'] as String,
      description: json['description'] as String? ?? draft.description,
      ownerPhoneNumber: json['ownerPhoneNumber'] as String,
      photos: responsePhotos,
      priceCdf: '${json['priceCdf']}',
      syncedDraftId: json['draftId'] as String,
      syncStatus: json['syncStatus'] as String,
      title: json['title'] as String,
    );
  }

  @override
  Future<PublishOutcome> publishDraft({
    required ListingDraft draft,
    required SellerSession session,
  }) async {
    final json = await _apiClient.postJson(
      '/moderation/publish',
      headers: {
        'authorization': 'Bearer ${session.sessionToken}',
      },
      body: {
        'categoryId': draft.categoryId,
        'description': draft.description,
        'draftId': draft.syncedDraftId,
        'ownerPhoneNumber': draft.ownerPhoneNumber ?? session.phoneNumber,
        'priceCdf': draft.priceCdfValue,
        'title': draft.title,
      },
    );

    return PublishOutcome(
      id: json['id'] as String,
      reasonSummary: json['reasonSummary'] as String,
      shareUrl: json['shareUrl'] as String,
      status: json['status'] as String,
      statusLabel: json['statusLabel'] as String,
    );
  }
}
