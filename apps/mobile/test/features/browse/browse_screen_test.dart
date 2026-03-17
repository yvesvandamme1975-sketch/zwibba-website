import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/services/listings_api_service.dart';

void main() {
  testWidgets('buyer browse renders the feed loaded from the listings api',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      listingsApiService: _FakeListingsApiService(),
    ));

    await tester.tap(find.text('Acheter'));
    await tester.pumpAndSettle();

    expect(find.text('Explorer les annonces'), findsOneWidget);
    expect(find.text('Samsung Galaxy A54 neuf sous emballage'), findsOneWidget);
    expect(find.text('Toyota Hilux 2019 diesel 4x4'), findsOneWidget);
    expect(find.text('Lubumbashi, Bel Air'), findsOneWidget);
  });
}

class _FakeListingsApiService implements ListingsApiService {
  @override
  Future<ListingDetail> fetchListingDetail(String slug) async {
    return ListingDetail(
      contactActions: const ['whatsapp', 'sms', 'call'],
      id: 'listing_1',
      locationLabel: 'Lubumbashi, Bel Air',
      priceCdf: 450000,
      safetyTips: const ['Rencontrez le vendeur dans un lieu public.'],
      sellerName: 'Patrick Mobile',
      sellerResponseTime: 'Répond en moyenne en 9 min',
      sellerRole: 'Vendeur pro',
      slug: slug,
      summary: 'Smartphone Samsung garanti.',
      title: 'Samsung Galaxy A54 neuf sous emballage',
    );
  }

  @override
  Future<List<ListingSummary>> fetchBrowseListings() async {
    return const [
      ListingSummary(
        categoryLabel: 'Téléphones & Tablettes',
        id: 'listing_1',
        locationLabel: 'Lubumbashi, Bel Air',
        priceCdf: 450000,
        slug: 'samsung-galaxy-a54-neuf-lubumbashi',
        title: 'Samsung Galaxy A54 neuf sous emballage',
      ),
      ListingSummary(
        categoryLabel: 'Véhicules',
        id: 'listing_2',
        locationLabel: 'Lubumbashi, Golf Plateau',
        priceCdf: 45000000,
        slug: 'toyota-hilux-2019-4x4',
        title: 'Toyota Hilux 2019 diesel 4x4',
      ),
    ];
  }
}
