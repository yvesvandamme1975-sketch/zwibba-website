import 'package:flutter/material.dart';

import '../../services/listings_api_service.dart';

class ListingDetailScreen extends StatelessWidget {
  const ListingDetailScreen({
    required this.detail,
    required this.onBack,
    required this.onContact,
    super.key,
  });

  final ListingDetail detail;
  final VoidCallback onBack;
  final VoidCallback onContact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        TextButton(
          onPressed: onBack,
          style: TextButton.styleFrom(alignment: Alignment.centerLeft),
          child: const Text('Retour aux annonces'),
        ),
        const SizedBox(height: 12),
        Text(detail.title, style: theme.textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          detail.summary,
          style: theme.textTheme.bodyLarge
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            color: const Color(0x0FFFFFFF),
            border: Border.all(color: const Color(0x14FFFFFF)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(detail.sellerName, style: theme.textTheme.titleLarge),
              const SizedBox(height: 6),
              Text(detail.sellerRole, style: theme.textTheme.bodyMedium),
              const SizedBox(height: 6),
              Text(
                detail.sellerResponseTime,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        Text('Conseils de sécurité', style: theme.textTheme.titleMedium),
        const SizedBox(height: 10),
        for (final tip in detail.safetyTips) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(tip, style: theme.textTheme.bodyMedium),
          ),
        ],
        const SizedBox(height: 18),
        FilledButton(
          onPressed: onContact,
          child: const Text('Contacter'),
        ),
      ],
    );
  }
}
