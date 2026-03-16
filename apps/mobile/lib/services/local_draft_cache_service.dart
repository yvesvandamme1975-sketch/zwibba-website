import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/listing_draft.dart';

abstract class DraftCacheBackend {
  Future<void> delete(String key);

  Future<String?> read(String key);

  Future<void> write({
    required String key,
    required String value,
  });
}

class SharedPreferencesDraftCacheBackend implements DraftCacheBackend {
  SharedPreferencesDraftCacheBackend({
    Future<SharedPreferences>? preferencesFuture,
  }) : _preferencesFuture =
            preferencesFuture ?? SharedPreferences.getInstance();

  final Future<SharedPreferences> _preferencesFuture;

  @override
  Future<void> delete(String key) async {
    final preferences = await _preferencesFuture;
    await preferences.remove(key);
  }

  @override
  Future<String?> read(String key) async {
    final preferences = await _preferencesFuture;
    return preferences.getString(key);
  }

  @override
  Future<void> write({
    required String key,
    required String value,
  }) async {
    final preferences = await _preferencesFuture;
    await preferences.setString(key, value);
  }
}

class LocalDraftCacheService {
  LocalDraftCacheService({
    DraftCacheBackend? backend,
  }) : _backend = backend ?? SharedPreferencesDraftCacheBackend();

  static const _draftCacheKey = 'zwibba_local_listing_draft';

  final DraftCacheBackend _backend;

  Future<void> clearDraft() async {
    try {
      await _backend.delete(_draftCacheKey);
    } catch (_) {
      // Ignore cache failures so the seller flow remains usable.
    }
  }

  Future<ListingDraft?> readDraft() async {
    try {
      final rawValue = await _backend.read(_draftCacheKey);

      if (rawValue == null || rawValue.isEmpty) {
        return null;
      }

      return ListingDraft.fromJson(
        Map<String, dynamic>.from(jsonDecode(rawValue) as Map),
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> writeDraft(ListingDraft draft) async {
    try {
      await _backend.write(
        key: _draftCacheKey,
        value: jsonEncode(draft.toJson()),
      );
    } catch (_) {
      // Ignore cache failures so photo capture and editing do not block.
    }
  }
}
