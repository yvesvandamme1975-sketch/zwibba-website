import 'package:flutter/material.dart';

import '../../services/listings_api_service.dart';

const Map<String, String> _fashionItemTypeLabels = {
  'shoes': 'Chaussures',
  'pants': 'Pantalon',
  'tops': 'T-shirt / Chemise',
  'dress_skirt': 'Robe / Jupe',
  'jacket_sweater': 'Veste / Pull',
  'jewelry_ring': 'Bague',
  'jewelry_earrings': "Boucles d'oreilles",
  'jewelry_necklace': 'Collier',
  'jewelry_bracelet': 'Bracelet',
  'jewelry_watch': 'Montre',
};

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
        _buildFashionDetailsBlock(context, detail),
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

Widget _buildFashionDetailsBlock(BuildContext context, ListingDetail detail) {
  if (detail.categoryId != 'fashion') {
    return const SizedBox.shrink();
  }

  final Map<String, dynamic>? fashion =
      (detail.attributesJson?['fashion'] as Map?)?.cast<String, dynamic>();
  final itemType = fashion?['itemType'] as String? ?? '';
  final label = _fashionItemTypeLabels[itemType] ?? '';
  final size = (fashion?['size'] as String? ?? '').trim();

  if (label.isEmpty && size.isEmpty) {
    return const SizedBox.shrink();
  }

  final theme = Theme.of(context);

  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text('Détails', style: theme.textTheme.titleMedium),
      if (label.isNotEmpty) ...[
        const SizedBox(height: 10),
        Text(
          "Type d'article : $label",
          style: theme.textTheme.bodyMedium,
        ),
      ],
      if (size.isNotEmpty) ...[
        const SizedBox(height: 8),
        Text(
          'Taille : $size',
          style: theme.textTheme.bodyMedium,
        ),
      ],
    ],
  );
}
