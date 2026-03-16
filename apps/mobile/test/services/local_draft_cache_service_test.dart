import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/models/listing_draft.dart';
import 'package:zwibba_mobile/services/local_draft_cache_service.dart';

void main() {
  test('local draft cache restores draft photo upload state', () async {
    final backend = _MemoryDraftCacheBackend();
    final service = LocalDraftCacheService(backend: backend);
    final draft = ListingDraft.fromCapturePreset(
      area: 'Lubumbashi Centre',
      description: 'Téléphone propre, batterie stable.',
      guidancePrompts: const ['Face', 'Dos', 'Écran allumé'],
      photos: const [
        DraftPhoto(
          objectKey: 'draft-photos/phone-front.jpg',
          photoId: 'photo_phone_front',
          publicUrl: 'https://cdn.zwibba.example/draft-photos/phone-front.jpg',
          sourcePresetId: 'phone-front',
          uploadStatus: 'uploaded',
        ),
      ],
      priceCdf: '4256000',
      title: 'Samsung Galaxy A54 128 Go',
    );

    await service.writeDraft(draft);
    final restoredDraft = await service.readDraft();

    expect(restoredDraft?.title, 'Samsung Galaxy A54 128 Go');
    expect(restoredDraft?.photos.length, 1);
    expect(restoredDraft?.photos.first.uploadStatus, 'uploaded');
    expect(
        restoredDraft?.photos.first.objectKey, 'draft-photos/phone-front.jpg');
  });
}

class _MemoryDraftCacheBackend implements DraftCacheBackend {
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
