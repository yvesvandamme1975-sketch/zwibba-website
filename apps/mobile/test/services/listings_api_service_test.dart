import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/services/api_client.dart';
import 'package:zwibba_mobile/services/listings_api_service.dart';

void main() {
  test('listings api service maps the browse feed and listing detail payload',
      () async {
    final apiClient = _FakeApiClient(
      getResponses: {
        '/listings': {
          'items': [
            {
              'id': 'listing_1',
              'slug': 'samsung-galaxy-a54-neuf-lubumbashi',
              'title': 'Samsung Galaxy A54 neuf sous emballage',
              'categoryLabel': 'Téléphones & Tablettes',
              'priceCdf': 450000,
              'locationLabel': 'Lubumbashi, Bel Air',
            },
          ],
        },
        '/listings/samsung-galaxy-a54-neuf-lubumbashi': {
          'id': 'listing_1',
          'slug': 'samsung-galaxy-a54-neuf-lubumbashi',
          'title': 'Samsung Galaxy A54 neuf sous emballage',
          'categoryLabel': 'Téléphones & Tablettes',
          'priceCdf': 450000,
          'locationLabel': 'Lubumbashi, Bel Air',
          'summary': 'Smartphone Samsung garanti, 128 Go, avec câble et coque.',
          'seller': {
            'name': 'Patrick Mobile',
            'role': 'Vendeur pro',
            'responseTime': 'Répond en moyenne en 9 min',
          },
          'safetyTips': [
            'Rencontrez le vendeur dans un lieu public.',
            'Vérifiez le produit avant de payer.',
          ],
          'contactActions': ['whatsapp', 'sms', 'call'],
        },
      },
    );
    final service = HttpListingsApiService(apiClient: apiClient);

    final listings = await service.fetchBrowseListings();
    final detail = await service.fetchListingDetail(
      'samsung-galaxy-a54-neuf-lubumbashi',
    );

    expect(listings.single.slug, 'samsung-galaxy-a54-neuf-lubumbashi');
    expect(listings.single.id, 'listing_1');
    expect(listings.single.categoryLabel, 'Téléphones & Tablettes');
    expect(listings.single.locationLabel, 'Lubumbashi, Bel Air');
    expect(detail.id, 'listing_1');
    expect(detail.title, 'Samsung Galaxy A54 neuf sous emballage');
    expect(detail.sellerName, 'Patrick Mobile');
    expect(detail.contactActions, ['whatsapp', 'sms', 'call']);
    expect(apiClient.getRequests, [
      '/listings',
      '/listings/samsung-galaxy-a54-neuf-lubumbashi',
    ]);
  });
}

class _FakeApiClient implements ApiClient {
  _FakeApiClient({
    required this.getResponses,
  });

  final List<String> getRequests = [];
  final Map<String, Map<String, dynamic>> getResponses;

  @override
  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? headers,
  }) async {
    getRequests.add(path);
    return getResponses[path]!;
  }

  @override
  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, String>? headers,
    required Map<String, dynamic> body,
  }) async {
    throw UnimplementedError();
  }
}
