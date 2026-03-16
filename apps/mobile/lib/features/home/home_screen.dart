import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    required this.hasDraft,
    required this.onPrimaryAction,
    this.draftSubtitle,
    super.key,
  });

  final String? draftSubtitle;
  final bool hasDraft;
  final VoidCallback onPrimaryAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        const _BrandHeader(),
        const SizedBox(height: 24),
        Text(
          'Le parcours vendeur commence ici.',
          style: theme.textTheme.headlineLarge,
        ),
        const SizedBox(height: 12),
        Text(
          'Prenez une photo, laissez Zwibba préparer le brouillon, puis publiez quand vous êtes prêt.',
          style: theme.textTheme.bodyLarge
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0x336BE66B), Color(0x141FFFFFF)],
            ),
            border: Border.all(color: const Color(0x446BE66B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                hasDraft ? 'Brouillon en cours' : 'Démarrage instantané',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: const Color(0xFF6BE66B),
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                hasDraft ? 'Continuer mon brouillon' : 'Prendre une photo',
                style: theme.textTheme.headlineSmall,
              ),
              if (draftSubtitle != null) ...[
                const SizedBox(height: 8),
                Text(
                  draftSubtitle!,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
              const SizedBox(height: 18),
              FilledButton(
                onPressed: onPrimaryAction,
                child: Text(
                    hasDraft ? 'Continuer mon brouillon' : 'Prendre une photo'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        _InfoCard(
          title: 'Recherche rapide',
          body: 'Téléphones, immobilier, véhicules, mode et maison.',
        ),
        const SizedBox(height: 14),
        _InfoCard(
          title: 'Flux récent',
          body:
              'Les annonces récentes resteront ici pendant que le vrai feed arrive côté API.',
        ),
      ],
    );
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x446BE66B)),
            color: const Color(0x1F6BE66B),
          ),
          child: Center(
            child: Text(
              'Z',
              style: theme.textTheme.titleMedium?.copyWith(
                color: const Color(0xFF6BE66B),
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Zwibba', style: theme.textTheme.titleLarge),
            Text(
              'Seller shell Flutter',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
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
