import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/services/api_client.dart';
import 'package:zwibba_mobile/services/media_api_service.dart';

void main() {
  test('media api service requests an upload slot and uploads bytes', () async {
    final uploader = _MemoryBinaryUploader();
    final service = HttpMediaApiService(
      apiClient: _FakeApiClient(),
      binaryUploader: uploader,
    );

    final slot = await service.requestUploadSlot(
      contentType: 'image/jpeg',
      fileName: 'phone-front.jpg',
      sourcePresetId: 'phone-front',
    );

    await service.uploadBytes(
      bytes: const [1, 2, 3, 4],
      contentType: 'image/jpeg',
      uploadUrl: slot.uploadUrl,
    );

    expect(slot.objectKey, 'draft-photos/phone-front.jpg');
    expect(slot.sourcePresetId, 'phone-front');
    expect(uploader.uploadedBytes, const [1, 2, 3, 4]);
    expect(uploader.uploadedContentType, 'image/jpeg');
  });
}

class _FakeApiClient implements ApiClient {
  @override
  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? headers,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, String>? headers,
    required Map<String, dynamic> body,
  }) async {
    expect(path, '/media/upload-url');

    return {
      'photoId': 'photo_phone_front',
      'objectKey': 'draft-photos/phone-front.jpg',
      'publicUrl': 'https://cdn.zwibba.example/draft-photos/phone-front.jpg',
      'sourcePresetId': body['sourcePresetId'],
      'uploadUrl': 'https://uploads.zwibba.example/phone-front',
    };
  }
}

class _MemoryBinaryUploader implements BinaryUploader {
  List<int>? uploadedBytes;
  String? uploadedContentType;
  Uri? uploadedUrl;

  @override
  Future<void> putBytes({
    required List<int> bytes,
    required String contentType,
    required Uri url,
  }) async {
    uploadedBytes = bytes;
    uploadedContentType = contentType;
    uploadedUrl = url;
  }
}
