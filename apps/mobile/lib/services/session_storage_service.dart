import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'auth_api_service.dart';

abstract class SessionStorageBackend {
  Future<void> delete(String key);

  Future<String?> read(String key);

  Future<void> write({
    required String key,
    required String value,
  });
}

class FlutterSecureSessionStorageBackend implements SessionStorageBackend {
  FlutterSecureSessionStorageBackend({
    FlutterSecureStorage? storage,
  }) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<void> delete(String key) {
    return _storage.delete(key: key);
  }

  @override
  Future<String?> read(String key) {
    return _storage.read(key: key);
  }

  @override
  Future<void> write({
    required String key,
    required String value,
  }) {
    return _storage.write(key: key, value: value);
  }
}

class SessionStorageService {
  SessionStorageService({
    SessionStorageBackend? backend,
  }) : _backend = backend ?? FlutterSecureSessionStorageBackend();

  static const _canSyncDraftsKey = 'zwibba_session_can_sync_drafts';
  static const _phoneNumberKey = 'zwibba_session_phone_number';
  static const _sessionTokenKey = 'zwibba_session_token';

  final SessionStorageBackend _backend;

  Future<void> clearSession() async {
    try {
      await _backend.delete(_canSyncDraftsKey);
      await _backend.delete(_phoneNumberKey);
      await _backend.delete(_sessionTokenKey);
    } catch (_) {
      // Ignore storage failures so the app flow still works in tests and unsupported runtimes.
    }
  }

  Future<SellerSession?> readSession() async {
    try {
      final canSyncDrafts = await _backend.read(_canSyncDraftsKey);
      final phoneNumber = await _backend.read(_phoneNumberKey);
      final sessionToken = await _backend.read(_sessionTokenKey);

      if (canSyncDrafts == null ||
          phoneNumber == null ||
          sessionToken == null) {
        return null;
      }

      return SellerSession(
        canSyncDrafts: canSyncDrafts == 'true',
        phoneNumber: phoneNumber,
        sessionToken: sessionToken,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> writeSession(SellerSession session) async {
    try {
      await _backend.write(
        key: _canSyncDraftsKey,
        value: '${session.canSyncDrafts}',
      );
      await _backend.write(
        key: _phoneNumberKey,
        value: session.phoneNumber,
      );
      await _backend.write(
        key: _sessionTokenKey,
        value: session.sessionToken,
      );
    } catch (_) {
      // Ignore storage failures so OTP success does not block seller progress.
    }
  }
}
