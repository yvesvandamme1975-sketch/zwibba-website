import 'api_client.dart';
import 'auth_api_service.dart';

class WalletTransaction {
  const WalletTransaction({
    required this.amountCdf,
    required this.createdAtLabel,
    required this.id,
    required this.kind,
    required this.label,
  });

  final int amountCdf;
  final String createdAtLabel;
  final String id;
  final String kind;
  final String label;
}

class WalletOverview {
  const WalletOverview({
    required this.balanceCdf,
    required this.transactions,
  });

  final int balanceCdf;
  final List<WalletTransaction> transactions;
}

class BoostResult {
  const BoostResult({
    required this.amountCdf,
    required this.listingId,
    required this.promoted,
    required this.statusLabel,
  });

  final int amountCdf;
  final String listingId;
  final bool promoted;
  final String statusLabel;
}

abstract class WalletApiService {
  Future<WalletOverview> fetchWallet({
    required SellerSession session,
  });

  Future<BoostResult> activateBoost({
    required String listingId,
    required SellerSession session,
  });
}

class HttpWalletApiService implements WalletApiService {
  HttpWalletApiService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<BoostResult> activateBoost({
    required String listingId,
    required SellerSession session,
  }) async {
    final json = await _apiClient.postJson(
      '/boost',
      headers: _sessionHeaders(session),
      body: {
        'listingId': listingId,
      },
    );

    return BoostResult(
      amountCdf: json['amountCdf'] as int,
      listingId: json['listingId'] as String,
      promoted: json['promoted'] as bool,
      statusLabel: json['statusLabel'] as String,
    );
  }

  @override
  Future<WalletOverview> fetchWallet({
    required SellerSession session,
  }) async {
    final json = await _apiClient.getJson(
      '/wallet',
      headers: _sessionHeaders(session),
    );
    final transactions = List<Map<String, dynamic>>.from(
      (json['transactions'] as List)
          .map((item) => Map<String, dynamic>.from(item as Map)),
    );

    return WalletOverview(
      balanceCdf: json['balanceCdf'] as int,
      transactions: transactions
          .map(
            (item) => WalletTransaction(
              amountCdf: item['amountCdf'] as int,
              createdAtLabel: item['createdAtLabel'] as String,
              id: item['id'] as String,
              kind: item['kind'] as String,
              label: item['label'] as String,
            ),
          )
          .toList(growable: false),
    );
  }

  Map<String, String> _sessionHeaders(SellerSession session) {
    return {
      'authorization': 'Bearer ${session.sessionToken}',
    };
  }
}
