import 'api_client.dart';
import 'auth_api_service.dart';

class ChatThreadSummary {
  const ChatThreadSummary({
    required this.id,
    required this.lastMessagePreview,
    required this.listingSlug,
    required this.listingTitle,
    required this.participantName,
    required this.unreadCount,
  });

  final String id;
  final String lastMessagePreview;
  final String listingSlug;
  final String listingTitle;
  final String participantName;
  final int unreadCount;
}

class ChatMessage {
  const ChatMessage({
    required this.body,
    required this.id,
    required this.senderRole,
    required this.sentAtLabel,
  });

  final String body;
  final String id;
  final String senderRole;
  final String sentAtLabel;
}

class ChatThread {
  const ChatThread({
    required this.id,
    required this.listingTitle,
    required this.messages,
    required this.participantName,
  });

  final String id;
  final String listingTitle;
  final List<ChatMessage> messages;
  final String participantName;
}

abstract class ChatApiService {
  Future<List<ChatThreadSummary>> fetchInbox({
    required SellerSession session,
  });

  Future<ChatThread> fetchThread(
    String threadId, {
    required SellerSession session,
  });

  Future<ChatThread> sendMessage({
    required String body,
    required SellerSession session,
    required String threadId,
  });
}

class HttpChatApiService implements ChatApiService {
  HttpChatApiService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<List<ChatThreadSummary>> fetchInbox({
    required SellerSession session,
  }) async {
    final json = await _apiClient.getJson(
      '/chat/threads',
      headers: _sessionHeaders(session),
    );
    final items = List<Map<String, dynamic>>.from(
      (json['items'] as List)
          .map((item) => Map<String, dynamic>.from(item as Map)),
    );

    return items
        .map(
          (item) => ChatThreadSummary(
            id: item['id'] as String,
            lastMessagePreview: item['lastMessagePreview'] as String,
            listingSlug: item['listingSlug'] as String,
            listingTitle: item['listingTitle'] as String,
            participantName: item['participantName'] as String,
            unreadCount: item['unreadCount'] as int,
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<ChatThread> fetchThread(
    String threadId, {
    required SellerSession session,
  }) async {
    final json = await _apiClient.getJson(
      '/chat/threads/$threadId',
      headers: _sessionHeaders(session),
    );
    return _mapThread(json);
  }

  @override
  Future<ChatThread> sendMessage({
    required String body,
    required SellerSession session,
    required String threadId,
  }) async {
    final json = await _apiClient.postJson(
      '/chat/threads/$threadId/messages',
      headers: _sessionHeaders(session),
      body: {
        'body': body,
      },
    );
    return _mapThread(json);
  }

  ChatThread _mapThread(Map<String, dynamic> json) {
    final messages = List<Map<String, dynamic>>.from(
      (json['messages'] as List)
          .map((item) => Map<String, dynamic>.from(item as Map)),
    );

    return ChatThread(
      id: json['id'] as String,
      listingTitle: json['listingTitle'] as String,
      messages: messages
          .map(
            (message) => ChatMessage(
              body: message['body'] as String,
              id: message['id'] as String,
              senderRole: message['senderRole'] as String,
              sentAtLabel: message['sentAtLabel'] as String,
            ),
          )
          .toList(growable: false),
      participantName: json['participantName'] as String,
    );
  }

  Map<String, String> _sessionHeaders(SellerSession session) {
    return {
      'authorization': 'Bearer ${session.sessionToken}',
    };
  }
}
