import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/services/api_client.dart';
import 'package:zwibba_mobile/services/wallet_api_service.dart';

void main() {
  test('wallet api service maps balance history and boost activation',
      () async {
    final apiClient = _FakeApiClient(
      getResponses: {
        '/wallet': {
          'balanceCdf': 120000,
          'transactions': [
            {
              'id': 'wallet_tx_1',
              'label': 'Vente Samsung Galaxy A54',
              'amountCdf': 450000,
              'kind': 'credit',
              'createdAtLabel': 'Aujourd’hui',
            },
          ],
        },
      },
      postResponses: {
        '/boost': {
          'listingId': 'draft_approved',
          'promoted': true,
          'amountCdf': 15000,
          'statusLabel': 'Boost activé pour 24 h',
        },
      },
    );
    final service = HttpWalletApiService(apiClient: apiClient);

    final wallet = await service.fetchWallet();
    final boost = await service.activateBoost(listingId: 'draft_approved');

    expect(wallet.balanceCdf, 120000);
    expect(wallet.transactions.single.label, 'Vente Samsung Galaxy A54');
    expect(boost.promoted, isTrue);
    expect(boost.amountCdf, 15000);
    expect(apiClient.getRequests, ['/wallet']);
    expect(apiClient.postRequests.single.body['listingId'], 'draft_approved');
  });
}

class _FakeApiClient implements ApiClient {
  _FakeApiClient({
    required this.getResponses,
    required this.postResponses,
  });

  final List<String> getRequests = [];
  final Map<String, Map<String, dynamic>> getResponses;
  final List<_RecordedPost> postRequests = [];
  final Map<String, Map<String, dynamic>> postResponses;

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
    postRequests.add(_RecordedPost(body: body, path: path));
    return postResponses[path]!;
  }
}

class _RecordedPost {
  const _RecordedPost({
    required this.body,
    required this.path,
  });

  final Map<String, dynamic> body;
  final String path;
}
