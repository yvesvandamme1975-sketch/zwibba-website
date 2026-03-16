import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/services/wallet_api_service.dart';

void main() {
  testWidgets('wallet tab renders the balance and recent transactions',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      walletApiService: _FakeWalletApiService(),
    ));

    await tester.tap(find.text('Portefeuille'));
    await tester.pumpAndSettle();

    expect(find.text('Mon portefeuille'), findsOneWidget);
    expect(find.text('120 000 CDF'), findsOneWidget);
    expect(find.text('Vente Samsung Galaxy A54'), findsOneWidget);
    expect(find.text('Boost annonce canapé'), findsOneWidget);
  });
}

class _FakeWalletApiService implements WalletApiService {
  @override
  Future<BoostResult> activateBoost({required String listingId}) async {
    return const BoostResult(
      amountCdf: 15000,
      listingId: 'draft_approved',
      promoted: true,
      statusLabel: 'Boost activé pour 24 h',
    );
  }

  @override
  Future<WalletOverview> fetchWallet() async {
    return const WalletOverview(
      balanceCdf: 120000,
      transactions: [
        WalletTransaction(
          amountCdf: 450000,
          createdAtLabel: 'Aujourd’hui',
          id: 'wallet_tx_1',
          kind: 'credit',
          label: 'Vente Samsung Galaxy A54',
        ),
        WalletTransaction(
          amountCdf: -15000,
          createdAtLabel: 'Hier',
          id: 'wallet_tx_2',
          kind: 'debit',
          label: 'Boost annonce canapé',
        ),
      ],
    );
  }
}
