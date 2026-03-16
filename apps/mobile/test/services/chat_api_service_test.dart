import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/services/api_client.dart';
import 'package:zwibba_mobile/services/chat_api_service.dart';

void main() {
  test('chat api service maps inbox, thread detail, and send message payloads',
      () async {
    final apiClient = _FakeApiClient(
      getResponses: {
        '/chat/threads': {
          'items': [
            {
              'id': 'thread_samsung_galaxy_a54',
              'listingSlug': 'samsung-galaxy-a54-neuf-lubumbashi',
              'listingTitle': 'Samsung Galaxy A54 neuf sous emballage',
              'lastMessagePreview': 'Disponible aujourd’hui.',
              'participantName': 'Patrick Mobile',
              'unreadCount': 1,
            },
          ],
        },
        '/chat/threads/thread_samsung_galaxy_a54': {
          'id': 'thread_samsung_galaxy_a54',
          'listingTitle': 'Samsung Galaxy A54 neuf sous emballage',
          'participantName': 'Patrick Mobile',
          'messages': [
            {
              'id': 'message_1',
              'body': 'Bonjour, toujours disponible ?',
              'senderRole': 'buyer',
              'sentAtLabel': '09:10',
            },
          ],
        },
      },
      postResponses: {
        '/chat/threads/thread_samsung_galaxy_a54/messages': {
          'id': 'thread_samsung_galaxy_a54',
          'listingTitle': 'Samsung Galaxy A54 neuf sous emballage',
          'participantName': 'Patrick Mobile',
          'messages': [
            {
              'id': 'message_1',
              'body': 'Bonjour, toujours disponible ?',
              'senderRole': 'buyer',
              'sentAtLabel': '09:10',
            },
            {
              'id': 'message_2',
              'body': 'Je peux passer ce soir ?',
              'senderRole': 'buyer',
              'sentAtLabel': '09:14',
            },
          ],
        },
      },
    );
    final service = HttpChatApiService(apiClient: apiClient);

    final inbox = await service.fetchInbox();
    final thread = await service.fetchThread('thread_samsung_galaxy_a54');
    final updatedThread = await service.sendMessage(
      threadId: 'thread_samsung_galaxy_a54',
      body: 'Je peux passer ce soir ?',
    );

    expect(inbox.single.listingTitle, 'Samsung Galaxy A54 neuf sous emballage');
    expect(thread.participantName, 'Patrick Mobile');
    expect(thread.messages.single.body, 'Bonjour, toujours disponible ?');
    expect(updatedThread.messages.last.body, 'Je peux passer ce soir ?');
    expect(apiClient.getRequests, [
      '/chat/threads',
      '/chat/threads/thread_samsung_galaxy_a54',
    ]);
    expect(
      apiClient.postRequests.single.body['body'],
      'Je peux passer ce soir ?',
    );
  });
}

class _FakeApiClient implements ApiClient {
  _FakeApiClient({
    required this.getResponses,
    required this.postResponses,
  });

  final List<String> getRequests = [];
  final Map<String, Map<String, dynamic>> getResponses;
  final List<_RecordedPost> postRequests = [];
  final Map<String, Map<String, dynamic>> postResponses;

  @override
  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? headers,
  }) async {
    getRequests.add(path);
    return getResponses[path]!;
  }

  @override
  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, String>? headers,
    required Map<String, dynamic> body,
  }) async {
    postRequests.add(_RecordedPost(body: body, path: path));
    return postResponses[path]!;
  }
}

class _RecordedPost {
  const _RecordedPost({
    required this.body,
    required this.path,
  });

  final Map<String, dynamic> body;
  final String path;
}
