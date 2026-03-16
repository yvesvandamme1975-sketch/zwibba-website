import 'package:flutter/material.dart';

class CameraPreset {
  const CameraPreset({
    required this.defaultArea,
    required this.defaultDescription,
    required this.defaultPriceCdf,
    required this.defaultTitle,
    required this.description,
    required this.guidancePrompts,
    required this.id,
    required this.label,
  });

  final String defaultArea;
  final String defaultDescription;
  final String defaultPriceCdf;
  final String defaultTitle;
  final String description;
  final List<String> guidancePrompts;
  final String id;
  final String label;
}

class CameraScreen extends StatelessWidget {
  const CameraScreen({
    this.busyLabel,
    required this.onBack,
    required this.onCapture,
    required this.presets,
    super.key,
  });

  final String? busyLabel;
  final VoidCallback onBack;
  final Future<void> Function(CameraPreset preset) onCapture;
  final List<CameraPreset> presets;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        TextButton(
          onPressed: onBack,
          style: TextButton.styleFrom(alignment: Alignment.centerLeft),
          child: const Text("Retour à l'accueil"),
        ),
        const SizedBox(height: 12),
        Text('Choisissez une photo de départ',
            style: theme.textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          'Le premier clic crée le brouillon vendeur et prépare les étapes guidées.',
          style: theme.textTheme.bodyLarge
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        if (busyLabel != null) ...[
          const SizedBox(height: 18),
          Text(
            busyLabel!,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF6BE66B),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
        const SizedBox(height: 18),
        for (final preset in presets) ...[
          _CaptureCard(
            preset: preset,
            onTap: () async {
              await onCapture(preset);
            },
          ),
          const SizedBox(height: 14),
        ],
      ],
    );
  }
}

class _CaptureCard extends StatelessWidget {
  const _CaptureCard({
    required this.onTap,
    required this.preset,
  });

  final Future<void> Function() onTap;
  final CameraPreset preset;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        color: const Color(0x0FFFFFFF),
        border: Border.all(color: const Color(0x14FFFFFF)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(preset.label, style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              preset.description,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () async {
                await onTap();
              },
              child: Text(preset.label),
            ),
          ],
        ),
      ),
    );
  }
}
