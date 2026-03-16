class ListingDraft {
  const ListingDraft({
    required this.area,
    this.categoryId = '',
    this.condition = '',
    required this.description,
    required this.guidancePrompts,
    this.ownerPhoneNumber,
    required this.priceCdf,
    this.suggestedPriceMaxCdf,
    this.suggestedPriceMinCdf,
    this.syncedDraftId,
    this.syncStatus,
    required this.title,
  });

  factory ListingDraft.fromCapturePreset({
    required String area,
    required String description,
    required List<String> guidancePrompts,
    required String priceCdf,
    required String title,
  }) {
    return ListingDraft(
      area: area,
      description: description,
      guidancePrompts: guidancePrompts,
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
      priceCdf: priceCdf ?? this.priceCdf,
      suggestedPriceMaxCdf: suggestedPriceMaxCdf ?? this.suggestedPriceMaxCdf,
      suggestedPriceMinCdf: suggestedPriceMinCdf ?? this.suggestedPriceMinCdf,
      syncedDraftId: syncedDraftId ?? this.syncedDraftId,
      syncStatus: syncStatus ?? this.syncStatus,
      title: title ?? this.title,
    );
  }
}
