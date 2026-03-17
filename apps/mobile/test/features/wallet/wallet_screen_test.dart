import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';
import 'package:zwibba_mobile/services/auth_api_service.dart';
import 'package:zwibba_mobile/services/session_storage_service.dart';
import 'package:zwibba_mobile/services/wallet_api_service.dart';

void main() {
  testWidgets('wallet tab asks for verification when no session is active',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      walletApiService: _FakeWalletApiService(),
    ));

    await tester.tap(find.text('Portefeuille'));
    await tester.pumpAndSettle();

    expect(
      find.text('Vérifiez votre numéro pour consulter votre portefeuille.'),
      findsOneWidget,
    );
  });

  testWidgets('wallet tab renders the balance and recent transactions',
      (tester) async {
    await tester.pumpWidget(ZwibbaApp(
      walletApiService: _FakeWalletApiService(),
      sessionStorageService: SessionStorageService(
        backend: _MemorySessionStorageBackend(
          initialValues: {
            'zwibba_session_can_sync_drafts': 'true',
            'zwibba_session_phone_number': '+243990000001',
            'zwibba_session_token': 'zwibba_session_saved',
          },
        ),
      ),
    ));
    await tester.pumpAndSettle();

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
  Future<BoostResult> activateBoost({
    required String listingId,
    required SellerSession session,
  }) async {
    return const BoostResult(
      amountCdf: 15000,
      listingId: 'draft_approved',
      promoted: true,
      statusLabel: 'Boost activé pour 24 h',
    );
  }

  @override
  Future<WalletOverview> fetchWallet({
    required SellerSession session,
  }) async {
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

class _MemorySessionStorageBackend implements SessionStorageBackend {
  _MemorySessionStorageBackend({
    this.initialValues = const {},
  }) : _store = Map<String, String>.from(initialValues);

  final Map<String, String> initialValues;
  final Map<String, String> _store;

  @override
  Future<void> delete(String key) async {
    _store.remove(key);
  }

  @override
  Future<String?> read(String key) async {
    return _store[key];
  }

  @override
  Future<void> write({
    required String key,
    required String value,
  }) async {
    _store[key] = value;
  }
}
