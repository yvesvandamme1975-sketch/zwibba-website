import 'package:flutter/material.dart';

import '../../services/chat_api_service.dart';

class ThreadScreen extends StatelessWidget {
  const ThreadScreen({
    required this.draftMessage,
    required this.isSending,
    required this.onBack,
    required this.onDraftMessageChanged,
    required this.onSend,
    required this.thread,
    super.key,
  });

  final String draftMessage;
  final bool isSending;
  final VoidCallback onBack;
  final ValueChanged<String> onDraftMessageChanged;
  final Future<void> Function() onSend;
  final ChatThread thread;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        children: [
          TextButton(
            onPressed: onBack,
            style: TextButton.styleFrom(alignment: Alignment.centerLeft),
            child: const Text('Retour aux messages'),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child:
                Text(thread.listingTitle, style: theme.textTheme.headlineSmall),
          ),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              thread.participantName,
              style: theme.textTheme.bodyLarge
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView(
              children: [
                for (final message in thread.messages) ...[
                  Align(
                    alignment: message.senderRole == 'buyer'
                        ? Alignment.centerRight
                        : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        color: message.senderRole == 'buyer'
                            ? const Color(0x336BE66B)
                            : const Color(0x14FFFFFF),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(message.body, style: theme.textTheme.bodyMedium),
                          const SizedBox(height: 6),
                          Text(
                            message.sentAtLabel,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: TextEditingController(text: draftMessage)
              ..selection =
                  TextSelection.collapsed(offset: draftMessage.length),
            onChanged: onDraftMessageChanged,
            decoration: const InputDecoration(
              labelText: 'Votre message',
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: isSending
                  ? null
                  : () async {
                      await onSend();
                    },
              child: Text(isSending ? 'Envoi...' : 'Envoyer'),
            ),
          ),
        ],
      ),
    );
  }
}
