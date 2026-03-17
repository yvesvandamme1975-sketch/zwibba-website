import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/services/listings_api_service.dart';

void main() {
  testWidgets('buyer can open a listing detail and reveal contact actions',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      listingsApiService: _FakeListingsApiService(),
    ));

    await tester.tap(find.text('Acheter'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Samsung Galaxy A54 neuf sous emballage'));
    await tester.pumpAndSettle();

    expect(find.text('Patrick Mobile'), findsOneWidget);
    expect(find.text('Répond en moyenne en 9 min'), findsOneWidget);
    expect(find.text('Conseils de sécurité'), findsOneWidget);
    expect(find.text('Rencontrez le vendeur dans un lieu public.'),
        findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Contacter'));
    await tester.pumpAndSettle();

    expect(find.text('WhatsApp'), findsOneWidget);
    expect(find.text('SMS'), findsOneWidget);
    expect(find.text('Appeler'), findsOneWidget);
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
      safetyTips: const [
        'Rencontrez le vendeur dans un lieu public.',
        'Vérifiez le produit avant de payer.',
      ],
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
    ];
  }
}
