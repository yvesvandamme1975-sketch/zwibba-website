import 'package:flutter/material.dart';

import '../../services/listings_api_service.dart';

class BrowseScreen extends StatelessWidget {
  const BrowseScreen({
    required this.isLoading,
    required this.listings,
    required this.onOpenListing,
    super.key,
  });

  final bool isLoading;
  final List<ListingSummary> listings;
  final ValueChanged<ListingSummary> onOpenListing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text('Explorer les annonces', style: theme.textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          'Le flux acheteur montre les annonces du feed réel et ouvre le détail complet.',
          style: theme.textTheme.bodyLarge
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 18),
        for (final listing in listings) ...[
          _BrowseCard(
            listing: listing,
            onTap: () {
              onOpenListing(listing);
            },
          ),
          const SizedBox(height: 14),
        ],
      ],
    );
  }
}

class _BrowseCard extends StatelessWidget {
  const _BrowseCard({
    required this.listing,
    required this.onTap,
  });

  final ListingSummary listing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            color: const Color(0x0FFFFFFF),
            border: Border.all(color: const Color(0x14FFFFFF)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(listing.title, style: theme.textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                listing.categoryLabel,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: const Color(0xFF6BE66B)),
              ),
              const SizedBox(height: 8),
              Text(listing.locationLabel, style: theme.textTheme.bodyMedium),
              const SizedBox(height: 8),
              Text(
                '${_formatPriceCdf(listing.priceCdf)} CDF',
                style: theme.textTheme.titleMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _formatPriceCdf(int value) {
  final digits = value.toString();
  final buffer = StringBuffer();

  for (var index = 0; index < digits.length; index += 1) {
    final reverseIndex = digits.length - index;
    buffer.write(digits[index]);

    if (reverseIndex > 1 && reverseIndex % 3 == 1) {
      buffer.write(' ');
    }
  }

  return buffer.toString().trimRight();
}
