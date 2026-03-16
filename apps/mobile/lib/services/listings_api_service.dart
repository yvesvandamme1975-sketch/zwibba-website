import 'api_client.dart';

class ListingSummary {
  const ListingSummary({
    required this.categoryLabel,
    required this.locationLabel,
    required this.priceCdf,
    required this.slug,
    required this.title,
  });

  final String categoryLabel;
  final String locationLabel;
  final int priceCdf;
  final String slug;
  final String title;
}

class ListingDetail {
  const ListingDetail({
    required this.contactActions,
    required this.locationLabel,
    required this.priceCdf,
    required this.safetyTips,
    required this.sellerName,
    required this.sellerResponseTime,
    required this.sellerRole,
    required this.slug,
    required this.summary,
    required this.title,
  });

  final List<String> contactActions;
  final String locationLabel;
  final int priceCdf;
  final List<String> safetyTips;
  final String sellerName;
  final String sellerResponseTime;
  final String sellerRole;
  final String slug;
  final String summary;
  final String title;
}

abstract class ListingsApiService {
  Future<List<ListingSummary>> fetchBrowseListings();

  Future<ListingDetail> fetchListingDetail(String slug);
}

class HttpListingsApiService implements ListingsApiService {
  HttpListingsApiService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<List<ListingSummary>> fetchBrowseListings() async {
    final json = await _apiClient.getJson('/listings');
    final items = List<Map<String, dynamic>>.from(
      (json['items'] as List)
          .map((item) => Map<String, dynamic>.from(item as Map)),
    );

    return items
        .map(
          (item) => ListingSummary(
            categoryLabel: item['categoryLabel'] as String,
            locationLabel: item['locationLabel'] as String,
            priceCdf: item['priceCdf'] as int,
            slug: item['slug'] as String,
            title: item['title'] as String,
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<ListingDetail> fetchListingDetail(String slug) async {
    final json = await _apiClient.getJson('/listings/$slug');
    final seller = Map<String, dynamic>.from(json['seller'] as Map);

    return ListingDetail(
      contactActions: List<String>.from(json['contactActions'] as List),
      locationLabel: json['locationLabel'] as String,
      priceCdf: json['priceCdf'] as int,
      safetyTips: List<String>.from(json['safetyTips'] as List),
      sellerName: seller['name'] as String,
      sellerResponseTime: seller['responseTime'] as String,
      sellerRole: seller['role'] as String,
      slug: json['slug'] as String,
      summary: json['summary'] as String,
      title: json['title'] as String,
    );
  }
}
