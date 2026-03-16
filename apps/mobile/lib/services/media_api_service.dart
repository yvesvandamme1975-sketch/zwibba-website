import 'package:http/http.dart' as http;

import 'api_client.dart';

class MediaUploadSlot {
  const MediaUploadSlot({
    required this.objectKey,
    required this.photoId,
    required this.publicUrl,
    required this.sourcePresetId,
    required this.uploadUrl,
  });

  final String objectKey;
  final String photoId;
  final String publicUrl;
  final String sourcePresetId;
  final Uri uploadUrl;
}

abstract class BinaryUploader {
  Future<void> putBytes({
    required List<int> bytes,
    required String contentType,
    required Uri url,
  });
}

class HttpBinaryUploader implements BinaryUploader {
  HttpBinaryUploader({
    http.Client? httpClient,
  }) : _httpClient = httpClient ?? http.Client();

  final http.Client _httpClient;

  @override
  Future<void> putBytes({
    required List<int> bytes,
    required String contentType,
    required Uri url,
  }) async {
    final response = await _httpClient.put(
      url,
      headers: {
        'content-type': contentType,
      },
      body: bytes,
    );

    if (response.statusCode >= 400) {
      throw Exception('Media upload failed (${response.statusCode}).');
    }
  }
}

abstract class MediaApiService {
  Future<MediaUploadSlot> requestUploadSlot({
    required String contentType,
    required String fileName,
    required String sourcePresetId,
  });

  Future<void> uploadBytes({
    required List<int> bytes,
    required String contentType,
    required Uri uploadUrl,
  });
}

class HttpMediaApiService implements MediaApiService {
  HttpMediaApiService({
    required ApiClient apiClient,
    BinaryUploader? binaryUploader,
  })  : _apiClient = apiClient,
        _binaryUploader = binaryUploader ?? HttpBinaryUploader();

  final ApiClient _apiClient;
  final BinaryUploader _binaryUploader;

  @override
  Future<MediaUploadSlot> requestUploadSlot({
    required String contentType,
    required String fileName,
    required String sourcePresetId,
  }) async {
    final json = await _apiClient.postJson(
      '/media/upload-url',
      body: {
        'contentType': contentType,
        'fileName': fileName,
        'sourcePresetId': sourcePresetId,
      },
    );

    return MediaUploadSlot(
      objectKey: json['objectKey'] as String,
      photoId: json['photoId'] as String,
      publicUrl: json['publicUrl'] as String,
      sourcePresetId: json['sourcePresetId'] as String,
      uploadUrl: Uri.parse(json['uploadUrl'] as String),
    );
  }

  @override
  Future<void> uploadBytes({
    required List<int> bytes,
    required String contentType,
    required Uri uploadUrl,
  }) {
    return _binaryUploader.putBytes(
      bytes: bytes,
      contentType: contentType,
      url: uploadUrl,
    );
  }
}
