import 'api_client.dart';

class OtpChallenge {
  const OtpChallenge({
    required this.challengeId,
    required this.expiresInSeconds,
    required this.phoneNumber,
  });

  factory OtpChallenge.fromJson(Map<String, dynamic> json) {
    return OtpChallenge(
      challengeId: json['challengeId'] as String,
      expiresInSeconds: json['expiresInSeconds'] as int,
      phoneNumber: json['phoneNumber'] as String,
    );
  }

  final String challengeId;
  final int expiresInSeconds;
  final String phoneNumber;
}

class SellerSession {
  const SellerSession({
    required this.canSyncDrafts,
    required this.phoneNumber,
    required this.sessionToken,
  });

  factory SellerSession.fromJson(Map<String, dynamic> json) {
    return SellerSession(
      canSyncDrafts: json['canSyncDrafts'] as bool,
      phoneNumber: json['phoneNumber'] as String,
      sessionToken: json['sessionToken'] as String,
    );
  }

  final bool canSyncDrafts;
  final String phoneNumber;
  final String sessionToken;
}

abstract class AuthApiService {
  Future<OtpChallenge> requestOtp({
    required String phoneNumber,
  });

  Future<SellerSession> verifyOtp({
    required String code,
    required String phoneNumber,
  });
}

class HttpAuthApiService implements AuthApiService {
  HttpAuthApiService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<OtpChallenge> requestOtp({
    required String phoneNumber,
  }) async {
    final json = await _apiClient.postJson(
      '/auth/request-otp',
      body: {
        'phoneNumber': phoneNumber,
      },
    );

    return OtpChallenge.fromJson(json);
  }

  @override
  Future<SellerSession> verifyOtp({
    required String code,
    required String phoneNumber,
  }) async {
    final json = await _apiClient.postJson(
      '/auth/verify-otp',
      body: {
        'code': code,
        'phoneNumber': phoneNumber,
      },
    );

    return SellerSession.fromJson(json);
  }
}
