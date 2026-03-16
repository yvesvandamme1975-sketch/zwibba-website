import 'dart:convert';

import 'package:http/http.dart' as http;

abstract class ApiClient {
  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? headers,
  });

  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, String>? headers,
    required Map<String, dynamic> body,
  });
}

class HttpApiClient implements ApiClient {
  HttpApiClient({
    required this.baseUrl,
    http.Client? httpClient,
  }) : _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _httpClient;

  @override
  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? headers,
  }) async {
    final response = await _httpClient.get(
      Uri.parse('$baseUrl$path'),
      headers: {
        ...?headers,
      },
    );

    if (response.statusCode >= 400) {
      throw Exception('API request failed for $path (${response.statusCode})');
    }

    return Map<String, dynamic>.from(
      jsonDecode(response.body) as Map,
    );
  }

  @override
  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, String>? headers,
    required Map<String, dynamic> body,
  }) async {
    final response = await _httpClient.post(
      Uri.parse('$baseUrl$path'),
      headers: {
        'content-type': 'application/json',
        ...?headers,
      },
      body: jsonEncode(body),
    );

    if (response.statusCode >= 400) {
      throw Exception('API request failed for $path (${response.statusCode})');
    }

    return Map<String, dynamic>.from(
      jsonDecode(response.body) as Map,
    );
  }
}
