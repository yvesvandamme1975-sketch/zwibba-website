import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/services/api_client.dart';
import 'package:zwibba_mobile/services/auth_api_service.dart';

void main() {
  test('auth api service requests otp and verifies the seller session payload',
      () async {
    final apiClient = _FakeApiClient(
      responses: {
        '/auth/request-otp': {
          'challengeId': 'otp_243990000001',
          'expiresInSeconds': 300,
          'phoneNumber': '+243990000001',
        },
        '/auth/verify-otp': {
          'canSyncDrafts': true,
          'phoneNumber': '+243990000001',
          'sessionToken': 'zwibba_session_243990000001',
        },
      },
    );
    final service = HttpAuthApiService(apiClient: apiClient);

    final challenge = await service.requestOtp(phoneNumber: '+243990000001');
    final session = await service.verifyOtp(
      phoneNumber: '+243990000001',
      code: '123456',
    );

    expect(challenge.phoneNumber, '+243990000001');
    expect(challenge.challengeId, 'otp_243990000001');
    expect(session.phoneNumber, '+243990000001');
    expect(session.canSyncDrafts, isTrue);
    expect(session.sessionToken, 'zwibba_session_243990000001');
    expect(apiClient.requests[0].path, '/auth/request-otp');
    expect(apiClient.requests[0].body['phoneNumber'], '+243990000001');
    expect(apiClient.requests[1].path, '/auth/verify-otp');
    expect(apiClient.requests[1].body['code'], '123456');
  });
}

class _FakeApiClient implements ApiClient {
  _FakeApiClient({
    required this.responses,
  });

  final List<_RecordedRequest> requests = [];
  final Map<String, Map<String, dynamic>> responses;

  @override
  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? headers,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, String>? headers,
    required Map<String, dynamic> body,
  }) async {
    requests.add(_RecordedRequest(
      body: body,
      headers: headers ?? const {},
      path: path,
    ));
    return responses[path]!;
  }
}

class _RecordedRequest {
  const _RecordedRequest({
    required this.body,
    required this.headers,
    required this.path,
  });

  final Map<String, dynamic> body;
  final Map<String, String> headers;
  final String path;
}
