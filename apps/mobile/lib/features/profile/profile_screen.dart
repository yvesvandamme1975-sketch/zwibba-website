import 'package:flutter/material.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text('Mon profil', style: theme.textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          '+243 990 000 001',
          style: theme.textTheme.titleMedium?.copyWith(
            color: const Color(0xFF6BE66B),
          ),
        ),
        const SizedBox(height: 18),
        _ProfileCard(
          title: 'Mes annonces publiées',
          body: '2 annonces actives, 1 en revue manuelle.',
        ),
        const SizedBox(height: 12),
        _ProfileCard(
          title: 'Support Zwibba',
          body: 'Besoin d’aide ? Le centre de support sera branché ici.',
        ),
      ],
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({
    required this.body,
    required this.title,
  });

  final String body;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        color: const Color(0x0FFFFFFF),
        border: Border.all(color: const Color(0x14FFFFFF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(
            body,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
