import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/services/auth_api_service.dart';
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
    const session = SellerSession(
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_243990000001',
    );

    final wallet = await service.fetchWallet(session: session);
    final boost = await service.activateBoost(
      listingId: 'draft_approved',
      session: session,
    );

    expect(wallet.balanceCdf, 120000);
    expect(wallet.transactions.single.label, 'Vente Samsung Galaxy A54');
    expect(boost.promoted, isTrue);
    expect(boost.amountCdf, 15000);
    expect(apiClient.getRequests, [
      ('/wallet', 'Bearer zwibba_session_243990000001'),
    ]);
    expect(apiClient.postRequests.single.body['listingId'], 'draft_approved');
    expect(
      apiClient.postRequests.single.authorization,
      'Bearer zwibba_session_243990000001',
    );
  });
}

class _FakeApiClient implements ApiClient {
  _FakeApiClient({
    required this.getResponses,
    required this.postResponses,
  });

  final List<(String, String?)> getRequests = [];
  final Map<String, Map<String, dynamic>> getResponses;
  final List<_RecordedPost> postRequests = [];
  final Map<String, Map<String, dynamic>> postResponses;

  @override
  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? headers,
  }) async {
    getRequests.add((path, headers?['authorization']));
    return getResponses[path]!;
  }

  @override
  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, String>? headers,
    required Map<String, dynamic> body,
  }) async {
    postRequests.add(_RecordedPost(
      authorization: headers?['authorization'],
      body: body,
      path: path,
    ));
    return postResponses[path]!;
  }
}

class _RecordedPost {
  const _RecordedPost({
    required this.authorization,
    required this.body,
    required this.path,
  });

  final String? authorization;
  final Map<String, dynamic> body;
  final String path;
}
