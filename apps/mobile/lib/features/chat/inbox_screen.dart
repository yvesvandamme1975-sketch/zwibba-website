import 'package:flutter/material.dart';

import '../../services/chat_api_service.dart';

class InboxScreen extends StatelessWidget {
  const InboxScreen({
    required this.isLoading,
    required this.onOpenThread,
    required this.threads,
    super.key,
  });

  final bool isLoading;
  final ValueChanged<ChatThreadSummary> onOpenThread;
  final List<ChatThreadSummary> threads;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text('Inbox Zwibba', style: theme.textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          'Vos conversations liées aux annonces restent ici.',
          style: theme.textTheme.bodyLarge
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 18),
        for (final thread in threads) ...[
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(22),
              onTap: () {
                onOpenThread(thread);
              },
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(22),
                  color: const Color(0x0FFFFFFF),
                  border: Border.all(color: const Color(0x14FFFFFF)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(thread.listingTitle,
                        style: theme.textTheme.titleMedium),
                    const SizedBox(height: 6),
                    Text(thread.participantName,
                        style: theme.textTheme.bodyMedium),
                    const SizedBox(height: 6),
                    Text(
                      thread.lastMessagePreview,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
      ],
    );
  }
}
