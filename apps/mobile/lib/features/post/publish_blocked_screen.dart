import 'package:flutter/material.dart';

class PublishBlockedScreen extends StatelessWidget {
  const PublishBlockedScreen({
    required this.onEditDraft,
    required this.reasonSummary,
    required this.statusLabel,
    super.key,
  });

  final VoidCallback onEditDraft;
  final String reasonSummary;
  final String statusLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text('Annonce bloquée', style: theme.textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          statusLabel,
          style: theme.textTheme.bodyLarge
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 6),
        Text(
          'Le brouillon reste disponible pour correction immédiate.',
          style: theme.textTheme.bodyMedium
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: const Color(0x14FF6B6B),
            border: Border.all(color: const Color(0x33FF6B6B)),
          ),
          child: Text(reasonSummary, style: theme.textTheme.bodyLarge),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: onEditDraft,
          child: const Text('Corriger le brouillon'),
        ),
      ],
    );
  }
}
