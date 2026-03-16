import 'package:flutter/material.dart';

class PhotoGuidanceScreen extends StatelessWidget {
  const PhotoGuidanceScreen({
    required this.listingTitle,
    required this.photoCount,
    required this.onBackHome,
    required this.onContinue,
    required this.prompts,
    super.key,
  });

  final String listingTitle;
  final int photoCount;
  final VoidCallback onBackHome;
  final VoidCallback onContinue;
  final List<String> prompts;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        TextButton(
          onPressed: onBackHome,
          style: TextButton.styleFrom(alignment: Alignment.centerLeft),
          child: const Text("Retour à l'accueil"),
        ),
        const SizedBox(height: 12),
        Text('Photos guidées', style: theme.textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          listingTitle,
          style: theme.textTheme.titleLarge
              ?.copyWith(color: const Color(0xFF6BE66B)),
        ),
        const SizedBox(height: 10),
        Text(
          'Zwibba vous indique les vues les plus utiles avant la relecture du brouillon.',
          style: theme.textTheme.bodyLarge
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: const Color(0x0FFFFFFF),
            border: Border.all(color: const Color(0x14FFFFFF)),
          ),
          child: Row(
            children: [
              const Icon(Icons.photo_library_outlined,
                  color: Color(0xFF6BE66B)),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  '$photoCount photo${photoCount > 1 ? 's' : ''} uploadée${photoCount > 1 ? 's' : ''} pour ce brouillon.',
                  style: theme.textTheme.titleMedium,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        for (final prompt in prompts) ...[
          _GuidancePrompt(label: prompt),
          const SizedBox(height: 12),
        ],
        const SizedBox(height: 12),
        FilledButton(
          onPressed: onContinue,
          child: const Text('Continuer vers le brouillon'),
        ),
      ],
    );
  }
}

class _GuidancePrompt extends StatelessWidget {
  const _GuidancePrompt({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: const Color(0x126BE66B),
        border: Border.all(color: const Color(0x336BE66B)),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, color: Color(0xFF6BE66B)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.titleMedium,
            ),
          ),
        ],
      ),
    );
  }
}
