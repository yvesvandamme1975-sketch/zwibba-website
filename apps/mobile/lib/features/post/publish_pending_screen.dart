import 'package:flutter/material.dart';

class PublishPendingScreen extends StatelessWidget {
  const PublishPendingScreen({
    required this.onBackHome,
    required this.reasonSummary,
    required this.statusLabel,
    super.key,
  });

  final VoidCallback onBackHome;
  final String reasonSummary;
  final String statusLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text('Annonce en revue', style: theme.textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          statusLabel,
          style: theme.textTheme.bodyLarge
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 6),
        Text(
          'La demande reste enregistrée pendant la revue manuelle.',
          style: theme.textTheme.bodyMedium
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: const Color(0x14FFFFFF),
            border: Border.all(color: const Color(0x1FFFFFFF)),
          ),
          child: Text(reasonSummary, style: theme.textTheme.bodyLarge),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: onBackHome,
          child: const Text("Retour à l'accueil"),
        ),
      ],
    );
  }
}
