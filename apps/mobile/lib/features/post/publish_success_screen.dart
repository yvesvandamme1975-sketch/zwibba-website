import 'package:flutter/material.dart';

class PublishSuccessScreen extends StatelessWidget {
  const PublishSuccessScreen({
    required this.listingTitle,
    required this.onBackHome,
    required this.onBoost,
    required this.onViewListing,
    required this.reasonSummary,
    required this.statusLabel,
    super.key,
  });

  final String listingTitle;
  final VoidCallback onBackHome;
  final VoidCallback onBoost;
  final VoidCallback onViewListing;
  final String reasonSummary;
  final String statusLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text('Annonce publiée', style: theme.textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          statusLabel,
          style: theme.textTheme.bodyLarge
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: const Color(0x126BE66B),
            border: Border.all(color: const Color(0x336BE66B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(listingTitle, style: theme.textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(reasonSummary, style: theme.textTheme.bodyMedium),
            ],
          ),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: () {},
          child: const Text('Partager sur WhatsApp'),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: onBoost,
          child: const Text('Booster cette annonce'),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: onViewListing,
          child: const Text("Voir mon annonce"),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: onBackHome,
          child: const Text("Retour à l'accueil"),
        ),
      ],
    );
  }
}
