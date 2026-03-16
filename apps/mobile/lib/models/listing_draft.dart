class DraftPhoto {
  const DraftPhoto({
    required this.objectKey,
    required this.photoId,
    required this.publicUrl,
    required this.sourcePresetId,
    required this.uploadStatus,
  });

  factory DraftPhoto.fromJson(Map<String, dynamic> json) {
    return DraftPhoto(
      objectKey: json['objectKey'] as String? ?? '',
      photoId: json['photoId'] as String? ?? '',
      publicUrl: json['publicUrl'] as String? ?? '',
      sourcePresetId: json['sourcePresetId'] as String? ?? '',
      uploadStatus: json['uploadStatus'] as String? ?? 'pending',
    );
  }

  final String objectKey;
  final String photoId;
  final String publicUrl;
  final String sourcePresetId;
  final String uploadStatus;

  Map<String, dynamic> toJson() {
    return {
      'objectKey': objectKey,
      'photoId': photoId,
      'publicUrl': publicUrl,
      'sourcePresetId': sourcePresetId,
      'uploadStatus': uploadStatus,
    };
  }

  DraftPhoto copyWith({
    String? objectKey,
    String? photoId,
    String? publicUrl,
    String? sourcePresetId,
    String? uploadStatus,
  }) {
    return DraftPhoto(
      objectKey: objectKey ?? this.objectKey,
      photoId: photoId ?? this.photoId,
      publicUrl: publicUrl ?? this.publicUrl,
      sourcePresetId: sourcePresetId ?? this.sourcePresetId,
      uploadStatus: uploadStatus ?? this.uploadStatus,
    );
  }
}

class ListingDraft {
  const ListingDraft({
    required this.area,
    this.categoryId = '',
    this.condition = '',
    required this.description,
    required this.guidancePrompts,
    this.ownerPhoneNumber,
    required this.photos,
    required this.priceCdf,
    this.suggestedPriceMaxCdf,
    this.suggestedPriceMinCdf,
    this.syncedDraftId,
    this.syncStatus,
    required this.title,
  });

  factory ListingDraft.fromJson(Map<String, dynamic> json) {
    return ListingDraft(
      area: json['area'] as String? ?? '',
      categoryId: json['categoryId'] as String? ?? '',
      condition: json['condition'] as String? ?? '',
      description: json['description'] as String? ?? '',
      guidancePrompts:
          (json['guidancePrompts'] as List<dynamic>? ?? const <dynamic>[])
              .cast<String>(),
      ownerPhoneNumber: json['ownerPhoneNumber'] as String?,
      photos: (json['photos'] as List<dynamic>? ?? const <dynamic>[])
          .map((photo) => DraftPhoto.fromJson(
              Map<String, dynamic>.from(photo as Map<dynamic, dynamic>)))
          .toList(),
      priceCdf: json['priceCdf'] as String? ?? '',
      suggestedPriceMaxCdf: json['suggestedPriceMaxCdf'] as int?,
      suggestedPriceMinCdf: json['suggestedPriceMinCdf'] as int?,
      syncedDraftId: json['syncedDraftId'] as String?,
      syncStatus: json['syncStatus'] as String?,
      title: json['title'] as String? ?? '',
    );
  }

  factory ListingDraft.fromCapturePreset({
    required String area,
    required String description,
    required List<String> guidancePrompts,
    required List<DraftPhoto> photos,
    required String priceCdf,
    required String title,
  }) {
    return ListingDraft(
      area: area,
      description: description,
      guidancePrompts: guidancePrompts,
      photos: photos,
      priceCdf: priceCdf,
      title: title,
    );
  }

  final String area;
  final String categoryId;
  final String condition;
  final String description;
  final List<String> guidancePrompts;
  final String? ownerPhoneNumber;
  final List<DraftPhoto> photos;
  final String priceCdf;
  final int? suggestedPriceMaxCdf;
  final int? suggestedPriceMinCdf;
  final String? syncedDraftId;
  final String? syncStatus;
  final String title;

  bool get isSynced => syncStatus == 'synced' && syncedDraftId != null;

  int get priceCdfValue => int.tryParse(priceCdf) ?? 0;

  ListingDraft copyWith({
    String? area,
    String? categoryId,
    String? condition,
    String? description,
    List<String>? guidancePrompts,
    String? ownerPhoneNumber,
    List<DraftPhoto>? photos,
    String? priceCdf,
    int? suggestedPriceMaxCdf,
    int? suggestedPriceMinCdf,
    String? syncedDraftId,
    String? syncStatus,
    String? title,
  }) {
    return ListingDraft(
      area: area ?? this.area,
      categoryId: categoryId ?? this.categoryId,
      condition: condition ?? this.condition,
      description: description ?? this.description,
      guidancePrompts: guidancePrompts ?? this.guidancePrompts,
      ownerPhoneNumber: ownerPhoneNumber ?? this.ownerPhoneNumber,
      photos: photos ?? this.photos,
      priceCdf: priceCdf ?? this.priceCdf,
      suggestedPriceMaxCdf: suggestedPriceMaxCdf ?? this.suggestedPriceMaxCdf,
      suggestedPriceMinCdf: suggestedPriceMinCdf ?? this.suggestedPriceMinCdf,
      syncedDraftId: syncedDraftId ?? this.syncedDraftId,
      syncStatus: syncStatus ?? this.syncStatus,
      title: title ?? this.title,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'area': area,
      'categoryId': categoryId,
      'condition': condition,
      'description': description,
      'guidancePrompts': guidancePrompts,
      'ownerPhoneNumber': ownerPhoneNumber,
      'photos': photos.map((photo) => photo.toJson()).toList(),
      'priceCdf': priceCdf,
      'suggestedPriceMaxCdf': suggestedPriceMaxCdf,
      'suggestedPriceMinCdf': suggestedPriceMinCdf,
      'syncedDraftId': syncedDraftId,
      'syncStatus': syncStatus,
      'title': title,
    };
  }
}
