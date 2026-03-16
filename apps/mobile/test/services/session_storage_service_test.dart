import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/services/auth_api_service.dart';
import 'package:zwibba_mobile/services/session_storage_service.dart';

void main() {
  test('session storage service persists and restores the seller session',
      () async {
    final backend = _MemorySessionStorageBackend();
    final service = SessionStorageService(backend: backend);
    const session = SellerSession(
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_243990000001',
    );

    await service.writeSession(session);
    final restoredSession = await service.readSession();

    expect(restoredSession?.phoneNumber, '+243990000001');
    expect(restoredSession?.sessionToken, 'zwibba_session_243990000001');
    expect(restoredSession?.canSyncDrafts, isTrue);
  });
}

class _MemorySessionStorageBackend implements SessionStorageBackend {
  final Map<String, String> _store = <String, String>{};

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
